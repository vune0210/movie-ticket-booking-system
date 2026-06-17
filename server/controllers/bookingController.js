const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const Movie = require('../models/Movie');
const Cinema = require('../models/Cinema');
const Seat = require('../models/Seat');
const Concession = require('../models/Concession');
const SeatLock = require('../models/SeatLock');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const validateObjectIds = (ids) => ids.every((id) => isValidObjectId(id));
const hasDuplicateIds = (ids) => {
  const normalized = ids.map((id) => id.toString());
  return new Set(normalized).size !== normalized.length;
};

const getCinemasForMovie = async (req, res) => {
  try {
    const { movieId } = req.params;

    if (!isValidObjectId(movieId)) {
      return res.status(400).json({
        success: false,
        message: 'movieId khong hop le.',
      });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay phim.',
      });
    }

    const showtimes = await Showtime.find({
      movie: movieId,
      timeStart: { $gte: new Date() },
    }).select('cinema');

    const cinemaIds = [...new Set(showtimes.map((st) => st.cinema.toString()))];
    if (cinemaIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Hien khong co rap nao dang chieu phim nay.',
        data: [],
      });
    }

    const cinemas = await Cinema.find({ _id: { $in: cinemaIds } }).sort({
      name: 1,
    });

    res.status(200).json({
      success: true,
      message: `Co ${cinemas.length} rap dang chieu phim "${movie.title}".`,
      data: {
        movie: {
          _id: movie._id,
          title: movie.title,
          posterUrl: movie.posterUrl,
        },
        cinemas,
      },
    });
  } catch (error) {
    console.error('Get Cinemas For Movie Error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi he thong. Vui long thu lai sau.',
    });
  }
};

const getShowtimesForBooking = async (req, res) => {
  try {
    const { movieId, cinemaId } = req.query;

    if (!movieId || !cinemaId) {
      return res.status(400).json({
        success: false,
        message: 'Vui long cung cap movieId va cinemaId.',
      });
    }

    if (!isValidObjectId(movieId) || !isValidObjectId(cinemaId)) {
      return res.status(400).json({
        success: false,
        message: 'movieId hoac cinemaId khong hop le.',
      });
    }

    const showtimes = await Showtime.find({
      movie: movieId,
      cinema: cinemaId,
      timeStart: { $gte: new Date() },
    })
      .populate('room', 'name typeRoom totalSeats')
      .sort({ timeStart: 1 });

    if (showtimes.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Khong co suat chieu nao phu hop.',
        data: [],
      });
    }

    const showtimeData = showtimes.map((st) => {
      const totalSeats = st.room ? st.room.totalSeats : 0;
      const remaining = totalSeats - st.bookedSeats.length;

      return {
        _id: st._id,
        room: st.room,
        timeStart: st.timeStart,
        timeEnd: st.timeEnd,
        totalSeats,
        bookedSeatsCount: st.bookedSeats.length,
        remainingSeat: remaining,
        isFull: remaining <= 0,
      };
    });

    res.status(200).json({
      success: true,
      data: showtimeData,
    });
  } catch (error) {
    console.error('Get Showtimes For Booking Error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi he thong. Vui long thu lai sau.',
    });
  }
};

const getSeatMap = async (req, res) => {
  try {
    const { showtimeId } = req.params;

    if (!isValidObjectId(showtimeId)) {
      return res.status(400).json({
        success: false,
        message: 'showtimeId khong hop le.',
      });
    }

    const showtime = await Showtime.findById(showtimeId).populate(
      'room',
      'name typeRoom totalSeats'
    );

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay suat chieu.',
      });
    }

    const totalSeats = showtime.room ? showtime.room.totalSeats : 0;
    const remaining = totalSeats - showtime.bookedSeats.length;

    if (remaining <= 0) {
      return res.status(200).json({
        success: true,
        message: 'Suat chieu nay da kin cho. Vui long chon suat chieu khac.',
        data: {
          room: showtime.room,
          isFull: true,
          seats: [],
        },
      });
    }

    const seats = await Seat.find({ room: showtime.room._id }).sort({
      row: 1,
      col: 1,
    });

    const seatLocks = await SeatLock.find({
      showtime: showtimeId,
      expiresAt: { $gt: new Date() },
    }).select('seat');

    const lockedSeatIds = new Set(seatLocks.map((lock) => lock.seat.toString()));

    const seatMap = seats.map((seat) => {
      const seatIdStr = seat._id.toString();
      const isBooked = showtime.bookedSeats.some(
        (bookedId) => bookedId.toString() === seatIdStr
      );
      const isLocked = lockedSeatIds.has(seatIdStr);

      let status = 'available';
      if (isBooked) {
        status = 'booked';
      } else if (isLocked) {
        status = 'locking';
      }

      return {
        _id: seat._id,
        seatNumber: seat.seatNumber,
        row: seat.row,
        col: seat.col,
        typeSeat: seat.typeSeat,
        price: seat.price,
        status,
        lockedByUser: isLocked,
      };
    });

    const seatsByRow = {};
    seatMap.forEach((seat) => {
      if (!seatsByRow[seat.row]) seatsByRow[seat.row] = [];
      seatsByRow[seat.row].push(seat);
    });

    res.status(200).json({
      success: true,
      data: {
        room: showtime.room,
        timeStart: showtime.timeStart,
        timeEnd: showtime.timeEnd,
        totalSeats,
        remainingSeat: remaining,
        isFull: false,
        seatsByRow,
        seats: seatMap,
      },
    });
  } catch (error) {
    console.error('Get Seat Map Error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi he thong. Vui long thu lai sau.',
    });
  }
};

const lockSeats = async (req, res) => {
  try {
    const { showtimeId } = req.params;
    const { seatIds } = req.body;
    const userId = req.user._id;

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui long chon it nhat 1 ghe.',
      });
    }

    if (!isValidObjectId(showtimeId) || !validateObjectIds(seatIds)) {
      return res.status(400).json({
        success: false,
        message: 'showtimeId hoac seatIds khong hop le.',
      });
    }

    if (hasDuplicateIds(seatIds)) {
      return res.status(400).json({
        success: false,
        message: 'Danh sach ghe khong duoc trung lap.',
      });
    }

    const requestedSeatIds = seatIds.map((seatId) => seatId.toString());
    const showtime = await Showtime.findById(showtimeId).populate('room', '_id');

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay suat chieu.',
      });
    }

    if (new Date() >= showtime.timeStart) {
      return res.status(400).json({
        success: false,
        message: 'Suat chieu da bat dau. Khong the giu ghe.',
      });
    }

    const seatsInRoom = await Seat.find({
      _id: { $in: requestedSeatIds },
      room: showtime.room._id || showtime.room,
    });

    if (seatsInRoom.length !== requestedSeatIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Mot so ghe khong ton tai hoac khong thuoc phong cua suat chieu.',
      });
    }

    const alreadyBooked = requestedSeatIds.filter(
      (seatId) => !showtime.isSeatAvailable(seatId)
    );

    if (alreadyBooked.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Mot so ghe da duoc dat. Vui long chon ghe khac.',
        data: { alreadyBookedSeats: alreadyBooked },
      });
    }

    await SeatLock.releaseUserLocks(showtimeId, userId);

    const lockResult = await SeatLock.lockSeats(showtimeId, requestedSeatIds, userId);
    if (!lockResult.success) {
      return res.status(409).json({
        success: false,
        message: lockResult.message,
      });
    }

    const seatTotal = seatsInRoom.reduce((sum, seat) => sum + seat.price, 0);

    res.status(200).json({
      success: true,
      message: `Da giu ${requestedSeatIds.length} ghe thanh cong. Ban co 5 phut de hoan tat thanh toan.`,
      data: {
        lockedSeats: seatsInRoom.map((s) => ({
          _id: s._id,
          seatNumber: s.seatNumber,
          typeSeat: s.typeSeat,
          price: s.price,
        })),
        seatTotal,
        expiresAt: lockResult.expiresAt,
      },
    });
  } catch (error) {
    console.error('Lock Seats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi he thong. Vui long thu lai sau.',
    });
  }
};

const unlockSeats = async (req, res) => {
  try {
    const { showtimeId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(showtimeId)) {
      return res.status(400).json({
        success: false,
        message: 'showtimeId khong hop le.',
      });
    }

    await SeatLock.releaseUserLocks(showtimeId, userId);

    res.status(200).json({
      success: true,
      message: 'Da giai phong ghe.',
    });
  } catch (error) {
    console.error('Unlock Seats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi he thong. Vui long thu lai sau.',
    });
  }
};

const getConcessions = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category) filter.category = category;

    const concessions = await Concession.find(filter).sort({ category: 1, name: 1 });

    const grouped = {};
    concessions.forEach((item) => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    res.status(200).json({
      success: true,
      data: {
        concessions,
        grouped,
        totalItems: concessions.length,
      },
    });
  } catch (error) {
    console.error('Get Concessions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi he thong. Vui long thu lai sau.',
    });
  }
};

const createBooking = async (req, res) => {
  const reservedSeatIds = [];

  try {
    const { showtimeId, seatIds, concessions, paymentMethod } = req.body;
    const userId = req.user._id;

    if (!showtimeId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui long cung cap suat chieu va it nhat 1 ghe.',
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Vui long chon phuong thuc thanh toan.',
      });
    }

    if (!['qr_wallet', 'atm_bank'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Phuong thuc thanh toan khong hop le.',
      });
    }

    if (!isValidObjectId(showtimeId) || !validateObjectIds(seatIds)) {
      return res.status(400).json({
        success: false,
        message: 'showtimeId hoac seatIds khong hop le.',
      });
    }

    if (hasDuplicateIds(seatIds)) {
      return res.status(400).json({
        success: false,
        message: 'Danh sach ghe khong duoc trung lap.',
      });
    }

    const requestedSeatIds = seatIds.map((seatId) => seatId.toString());
    const showtime = await Showtime.findById(showtimeId).populate('room', '_id totalSeats');

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay suat chieu.',
      });
    }

    if (new Date() >= showtime.timeStart) {
      return res.status(400).json({
        success: false,
        message: 'Suat chieu nay da bat dau. Khong the dat ve.',
      });
    }

    const hasValidLocks = await SeatLock.verifyUserLocks(
      showtimeId,
      requestedSeatIds,
      userId
    );

    if (!hasValidLocks) {
      return res.status(400).json({
        success: false,
        message: 'Ghe da het thoi gian giu hoac da bi nguoi khac dat. Vui long chon lai.',
      });
    }

    const unavailableSeats = requestedSeatIds.filter(
      (seatId) => !showtime.isSeatAvailable(seatId)
    );

    if (unavailableSeats.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Mot so ghe da duoc dat. Vui long chon ghe khac.',
      });
    }

    const seats = await Seat.find({
      _id: { $in: requestedSeatIds },
      room: showtime.room._id || showtime.room,
    });

    if (seats.length !== requestedSeatIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Mot so ghe khong ton tai hoac khong thuoc phong cua suat chieu.',
      });
    }

    const seatTotal = seats.reduce((sum, seat) => sum + seat.price, 0);
    const concessionItems = [];
    let concessionTotal = 0;

    if (concessions !== undefined && !Array.isArray(concessions)) {
      return res.status(400).json({
        success: false,
        message: 'Danh sach bap nuoc khong hop le.',
      });
    }

    if (Array.isArray(concessions) && concessions.length > 0) {
      const concessionIds = concessions.map((item) => item.concessionId);

      if (!validateObjectIds(concessionIds)) {
        return res.status(400).json({
          success: false,
          message: 'concessionId khong hop le.',
        });
      }

      const concessionDocs = await Concession.find({ _id: { $in: concessionIds } });
      const concessionMap = {};
      concessionDocs.forEach((doc) => {
        concessionMap[doc._id.toString()] = doc;
      });

      for (const item of concessions) {
        const concessionDoc = concessionMap[item.concessionId];
        const quantity = Number.parseInt(item.quantity, 10);

        if (!concessionDoc) {
          return res.status(400).json({
            success: false,
            message: `San pham bap nuoc "${item.concessionId}" khong ton tai.`,
          });
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
          return res.status(400).json({
            success: false,
            message: 'So luong bap nuoc phai la so nguyen lon hon 0.',
          });
        }

        concessionTotal += concessionDoc.price * quantity;
        concessionItems.push({
          concession: concessionDoc._id,
          quantity,
          price: concessionDoc.price,
        });
      }
    }

    const reservedShowtime = await Showtime.findOneAndUpdate(
      { _id: showtimeId, bookedSeats: { $nin: requestedSeatIds } },
      { $addToSet: { bookedSeats: { $each: requestedSeatIds } } },
      { new: true }
    );

    if (!reservedShowtime) {
      return res.status(409).json({
        success: false,
        message: 'Mot so ghe vua duoc dat. Vui long chon ghe khac.',
      });
    }
    reservedSeatIds.push(...requestedSeatIds);

    const totalPrice = seatTotal + concessionTotal;
    const booking = new Booking({
      user: userId,
      showtime: showtimeId,
      seats: requestedSeatIds,
      concessions: concessionItems,
      totalPrice,
      status: 'pending',
      paymentMethod,
    });

    try {
      await booking.save();
    } catch (error) {
      await Showtime.findByIdAndUpdate(showtimeId, {
        $pull: { bookedSeats: { $in: reservedSeatIds } },
      });
      throw error;
    }

    await SeatLock.deleteMany({
      showtime: showtimeId,
      seat: { $in: requestedSeatIds },
      user: userId,
    });

    await booking.populate([
      { path: 'user', select: 'name email phoneNumber' },
      {
        path: 'showtime',
        populate: [
          { path: 'movie', select: 'title posterUrl runningTime rated' },
          { path: 'cinema', select: 'name address' },
          { path: 'room', select: 'name typeRoom' },
        ],
      },
      { path: 'seats', select: 'seatNumber typeSeat price row col' },
      { path: 'concessions.concession', select: 'name price category' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Dat ve thanh cong. Vui long thanh toan trong vong 5 phut.',
      data: {
        booking,
        priceBreakdown: {
          seatTotal,
          concessionTotal,
          totalPrice,
        },
        paymentExpiry: booking.paymentExpiry,
      },
    });
  } catch (error) {
    if (reservedSeatIds.length > 0) {
      const showtimeId = req.body && req.body.showtimeId;
      if (isValidObjectId(showtimeId)) {
        await Showtime.findByIdAndUpdate(showtimeId, {
          $pull: { bookedSeats: { $in: reservedSeatIds } },
        });
      }
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }

    console.error('Create Booking Error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi he thong khi dat ve. Vui long thu lai.',
    });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { user: userId };
    if (status) filter.status = status;

    const pageNum = Number.parseInt(page, 10) || 1;
    const limitNum = Number.parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const expiredBookings = await Booking.find({
      user: userId,
      status: 'pending',
      paymentExpiry: { $lt: new Date() },
    });

    for (const expired of expiredBookings) {
      expired.status = 'cancelled';
      await expired.save();
      await Showtime.findByIdAndUpdate(expired.showtime, {
        $pull: { bookedSeats: { $in: expired.seats } },
      });
    }

    const [bookings, totalCount] = await Promise.all([
      Booking.find(filter)
        .populate({
          path: 'showtime',
          populate: [
            { path: 'movie', select: 'title posterUrl runningTime rated' },
            { path: 'cinema', select: 'name address' },
            { path: 'room', select: 'name typeRoom' },
          ],
        })
        .populate('seats', 'seatNumber typeSeat price')
        .populate('concessions.concession', 'name price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
        },
      },
    });
  } catch (error) {
    console.error('Get My Bookings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi he thong. Vui long thu lai sau.',
    });
  }
};

const getBookingById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'bookingId khong hop le.',
      });
    }

    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phoneNumber')
      .populate({
        path: 'showtime',
        populate: [
          { path: 'movie', select: 'title posterUrl runningTime rated genre director' },
          { path: 'cinema', select: 'name address hotline' },
          { path: 'room', select: 'name typeRoom' },
        ],
      })
      .populate('seats', 'seatNumber typeSeat price row col')
      .populate('concessions.concession', 'name price category');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay don dat ve.',
      });
    }

    if (
      booking.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Ban khong co quyen xem don dat ve nay.',
      });
    }

    if (booking.isPaymentExpired()) {
      booking.status = 'cancelled';
      await booking.save();

      await Showtime.findByIdAndUpdate(booking.showtime._id || booking.showtime, {
        $pull: {
          bookedSeats: { $in: booking.seats.map((seat) => seat._id || seat) },
        },
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('Get Booking By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi he thong. Vui long thu lai sau.',
    });
  }
};

module.exports = {
  getCinemasForMovie,
  getShowtimesForBooking,
  getSeatMap,
  lockSeats,
  unlockSeats,
  getConcessions,
  createBooking,
  getMyBookings,
  getBookingById,
};
