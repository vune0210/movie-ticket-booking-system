const mongoose = require('mongoose');
const Cinema = require('../models/Cinema');
const Showtime = require('../models/Showtime');
const Movie = require('../models/Movie');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ========================
// @desc    Tra cứu rạp phim (theo tên rạp hoặc tên phim đang chiếu)
// @route   GET /api/cinemas
// @access  Public
// @query   keyword, page, limit
// ========================
const getCinemas = async (req, res) => {
  try {
    const { keyword, page = 1, limit = 10 } = req.query;

    let cinemaIds = null;

    if (keyword) {
      // Bước 1: Tìm rạp trực tiếp theo tên rạp
      const cinemasByName = await Cinema.find({
        name: { $regex: keyword, $options: 'i' },
      }).select('_id');

      const directCinemaIds = cinemasByName.map((c) => c._id);

      // Bước 2: Tìm phim theo tên → Lấy showtime → Lấy rạp
      const matchingMovies = await Movie.find({
        title: { $regex: keyword, $options: 'i' },
      }).select('_id');

      let showtimeCinemaIds = [];
      if (matchingMovies.length > 0) {
        const movieIds = matchingMovies.map((m) => m._id);
        const showtimes = await Showtime.find({
          movie: { $in: movieIds },
          timeStart: { $gte: new Date() }, // Chỉ suất chiếu sắp tới
        }).select('cinema');

        showtimeCinemaIds = showtimes.map((s) => s.cinema);
      }

      // Gộp danh sách rạp (loại trùng)
      const allCinemaIds = [
        ...new Set([
          ...directCinemaIds.map((id) => id.toString()),
          ...showtimeCinemaIds.map((id) => id.toString()),
        ]),
      ];

      cinemaIds = allCinemaIds;
    }

    // ----- Xây dựng filter -----
    const filter = cinemaIds !== null ? { _id: { $in: cinemaIds } } : {};

    // ----- Phân trang -----
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [cinemas, totalCount] = await Promise.all([
      Cinema.find(filter).sort({ name: 1 }).skip(skip).limit(limitNum),
      Cinema.countDocuments(filter),
    ]);

    // Nếu không tìm thấy
    if (cinemas.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Không tìm thấy rạp phim phù hợp.',
        data: [],
        pagination: {
          currentPage: pageNum,
          totalPages: 0,
          totalCount: 0,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: `Tìm thấy ${totalCount} rạp phim.`,
      data: cinemas,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('❌ Get Cinemas Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

// ========================
// @desc    Lấy chi tiết rạp phim kèm danh sách phòng chiếu
// @route   GET /api/cinemas/:id
// @access  Public
// ========================
const getCinemaById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'cinemaId khong hop le.',
      });
    }

    const cinema = await Cinema.findById(req.params.id);

    if (!cinema) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy rạp phim.',
      });
    }

    // Lấy danh sách suất chiếu sắp tới của rạp này
    const showtimes = await Showtime.find({
      cinema: req.params.id,
      timeStart: { $gte: new Date() },
    })
      .populate('movie', 'title posterUrl genre runningTime rated ratingAverage')
      .populate('room', 'name typeRoom totalSeats')
      .sort({ timeStart: 1 });

    // Nhóm suất chiếu theo phim để hiển thị dễ hơn
    const movieShowtimeMap = {};
    showtimes.forEach((st) => {
      const movieId = st.movie._id.toString();
      if (!movieShowtimeMap[movieId]) {
        movieShowtimeMap[movieId] = {
          movie: st.movie,
          showtimes: [],
        };
      }
      movieShowtimeMap[movieId].showtimes.push({
        _id: st._id,
        room: st.room,
        timeStart: st.timeStart,
        timeEnd: st.timeEnd,
        bookedSeatsCount: st.bookedSeats.length,
      });
    });

    const moviesWithShowtimes = Object.values(movieShowtimeMap);

    res.status(200).json({
      success: true,
      data: {
        cinema,
        moviesWithShowtimes,
      },
    });
  } catch (error) {
    console.error('❌ Get Cinema By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

module.exports = {
  getCinemas,
  getCinemaById,
};
