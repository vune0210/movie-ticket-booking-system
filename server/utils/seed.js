/**
 * Seed Data Script
 * Chạy: node server/utils/seed.js
 * Tạo dữ liệu mẫu cho toàn bộ hệ thống
 */

const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Movie = require('../models/Movie');
const Cinema = require('../models/Cinema');
const Room = require('../models/Room');
const Seat = require('../models/Seat');
const Showtime = require('../models/Showtime');
const Concession = require('../models/Concession');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/movie_booking_db';

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Kết nối MongoDB thành công');

    // Xóa dữ liệu cũ
    await Promise.all([
      User.deleteMany({}),
      Movie.deleteMany({}),
      Cinema.deleteMany({}),
      Room.deleteMany({}),
      Seat.deleteMany({}),
      Showtime.deleteMany({}),
      Concession.deleteMany({}),
    ]);
    console.log('🗑️  Đã xóa dữ liệu cũ');

    // ========================
    // 1. USERS
    // ========================
    const users = await User.create([
      {
        name: 'Nguyễn Văn Admin',
        email: 'admin@cinebooking.vn',
        phoneNumber: '0901234567',
        password: '123456',
        gender: 'Nam',
        birthday: new Date('1990-05-15'),
        role: 'admin',
        isVerified: true,
      },
      {
        name: 'Trần Thị Minh',
        email: 'minh@gmail.com',
        phoneNumber: '0912345678',
        password: '123456',
        gender: 'Nữ',
        birthday: new Date('1998-08-20'),
        role: 'member',
        isVerified: true,
      },
      {
        name: 'Lê Hoàng Nam',
        email: 'nam@gmail.com',
        phoneNumber: '0923456789',
        password: '123456',
        gender: 'Nam',
        birthday: new Date('2000-03-10'),
        role: 'user',
        isVerified: true,
      },
    ]);
    console.log(`👤 Đã tạo ${users.length} users`);

    // ========================
    // 2. MOVIES
    // ========================
    const now = new Date();
    const movies = await Movie.create([
      {
        title: 'Lật Mặt 8: Vòng Tay Nắng',
        description: 'Phần 8 của series phim Lật Mặt nổi tiếng, câu chuyện cảm động về tình cảm gia đình.',
        genre: ['Tình Cảm', 'Gia Đình'],
        director: 'Lý Hải',
        cast: ['Lý Hải', 'Trấn Thành', 'Kiều Minh Tuấn', 'Ốc Thanh Vân'],
        releaseDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        runningTime: 130,
        language: 'Tiếng Việt',
        rated: 'P',
        ratingAverage: 8.5,
        country: 'Việt Nam',
        status: 'now_showing',
        posterUrl: 'https://placehold.co/300x450?text=Lat+Mat+8',
      },
      {
        title: 'Avengers: Doomsday',
        description: 'Các siêu anh hùng Avengers tập hợp lần cuối để đối đầu với mối đe dọa lớn nhất.',
        genre: ['Hành Động', 'Khoa Học Viễn Tưởng', 'Phiêu Lưu'],
        director: 'Joe Russo',
        cast: ['Robert Downey Jr.', 'Chris Evans', 'Scarlett Johansson'],
        releaseDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        runningTime: 165,
        language: 'Tiếng Anh - Phụ đề Việt',
        rated: 'C13',
        ratingAverage: 9.2,
        country: 'Mỹ',
        status: 'now_showing',
        posterUrl: 'https://placehold.co/300x450?text=Avengers+Doomsday',
      },
      {
        title: 'Quỷ Nhập Tràng',
        description: 'Bộ phim kinh dị Việt Nam lấy cảm hứng từ những câu chuyện dân gian rùng rợn.',
        genre: ['Kinh Dị', 'Tâm Lý'],
        director: 'Trần Hữu Tấn',
        cast: ['Quang Tuấn', 'Nguyễn Lâm Thảo Tâm'],
        releaseDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        runningTime: 110,
        language: 'Tiếng Việt',
        rated: 'C18',
        ratingAverage: 7.8,
        country: 'Việt Nam',
        status: 'now_showing',
        posterUrl: 'https://placehold.co/300x450?text=Quy+Nhap+Trang',
      },
      {
        title: 'Doraemon: Nobita và Vùng Đất Lý Tưởng',
        description: 'Nobita và những người bạn phiêu lưu tìm kiếm vùng đất lý tưởng trên bầu trời.',
        genre: ['Hoạt Hình', 'Phiêu Lưu', 'Gia Đình'],
        director: 'Takumi Doyama',
        cast: ['Doraemon', 'Nobita', 'Shizuka'],
        releaseDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        runningTime: 105,
        language: 'Tiếng Nhật - Lồng tiếng Việt',
        rated: 'P',
        ratingAverage: 0,
        country: 'Nhật Bản',
        status: 'coming_soon',
        posterUrl: 'https://placehold.co/300x450?text=Doraemon',
      },
      {
        title: 'Mai',
        description: 'Câu chuyện tình yêu đầy xúc động giữa anh xe ôm và cô gái massage.',
        genre: ['Tình Cảm', 'Tâm Lý'],
        director: 'Trấn Thành',
        cast: ['Trấn Thành', 'Phương Anh Đào', 'Tuấn Trần'],
        releaseDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        runningTime: 130,
        language: 'Tiếng Việt',
        rated: 'C16',
        ratingAverage: 8.0,
        country: 'Việt Nam',
        status: 'ended',
        posterUrl: 'https://placehold.co/300x450?text=Mai',
      },
    ]);
    console.log(`🎬 Đã tạo ${movies.length} phim`);

    // ========================
    // 3. CINEMAS
    // ========================
    const cinemas = await Cinema.create([
      {
        name: 'CineBooking Quận 1',
        address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
        roomCount: 3,
        hotline: '1900 1234',
      },
      {
        name: 'CineBooking Quận 7',
        address: '456 Nguyễn Thị Thập, Quận 7, TP.HCM',
        roomCount: 2,
        hotline: '1900 5678',
      },
    ]);
    console.log(`🏢 Đã tạo ${cinemas.length} rạp phim`);

    // ========================
    // 4. ROOMS
    // ========================
    const rooms = await Room.create([
      { cinema: cinemas[0]._id, name: 'Phòng 1', totalSeats: 40, typeRoom: '2D' },
      { cinema: cinemas[0]._id, name: 'Phòng 2', totalSeats: 30, typeRoom: '3D' },
      { cinema: cinemas[0]._id, name: 'Phòng 3', totalSeats: 20, typeRoom: 'IMAX' },
      { cinema: cinemas[1]._id, name: 'Phòng 1', totalSeats: 35, typeRoom: '2D' },
      { cinema: cinemas[1]._id, name: 'Phòng 2', totalSeats: 25, typeRoom: '4DX' },
    ]);
    console.log(`🚪 Đã tạo ${rooms.length} phòng chiếu`);

    // ========================
    // 5. SEATS (tạo cho mỗi phòng)
    // ========================
    let totalSeats = 0;
    for (const room of rooms) {
      const seats = [];
      const rows = ['A', 'B', 'C', 'D', 'E'];
      const colsPerRow = Math.ceil(room.totalSeats / rows.length);

      let seatCount = 0;
      for (const row of rows) {
        for (let col = 1; col <= colsPerRow && seatCount < room.totalSeats; col++) {
          const isVIP = row === 'C' || row === 'D'; // Hàng C, D là VIP
          seats.push({
            room: room._id,
            seatNumber: `${row}${col}`,
            row,
            col,
            typeSeat: isVIP ? 'VIP' : 'Thường',
            price: isVIP ? 120000 : 80000,
          });
          seatCount++;
        }
      }

      await Seat.insertMany(seats);
      totalSeats += seats.length;
    }
    console.log(`💺 Đã tạo ${totalSeats} ghế`);

    // ========================
    // 6. SHOWTIMES (tạo suất chiếu cho ngày hôm nay và mai)
    // ========================
    const showtimeData = [];
    const showingMovies = movies.filter((m) => m.status === 'now_showing');

    for (const movie of showingMovies) {
      for (const cinema of cinemas) {
        const cinemaRooms = rooms.filter(
          (r) => r.cinema.toString() === cinema._id.toString()
        );
        const room = cinemaRooms[0]; // Dùng phòng 1 của mỗi rạp

        // 3 suất chiếu: chiều, tối, khuya
        const times = [
          { hour: 14, min: 0 },
          { hour: 18, min: 30 },
          { hour: 21, min: 0 },
        ];

        for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
          for (const t of times) {
            const start = new Date();
            start.setDate(start.getDate() + dayOffset);
            start.setHours(t.hour, t.min, 0, 0);

            const end = new Date(start.getTime() + movie.runningTime * 60 * 1000);

            // Chỉ tạo suất chiếu trong tương lai
            if (start > now) {
              showtimeData.push({
                movie: movie._id,
                cinema: cinema._id,
                room: room._id,
                timeStart: start,
                timeEnd: end,
                bookedSeats: [],
              });
            }
          }
        }
      }
    }

    const showtimes = await Showtime.insertMany(showtimeData);
    console.log(`🕐 Đã tạo ${showtimes.length} suất chiếu`);

    // ========================
    // 7. CONCESSIONS (Bắp nước)
    // ========================
    const concessions = await Concession.create([
      { name: 'Bắp Rang Bơ Nhỏ', price: 49000, category: 'Bắp', description: 'Bắp rang bơ size nhỏ' },
      { name: 'Bắp Rang Bơ Lớn', price: 69000, category: 'Bắp', description: 'Bắp rang bơ size lớn' },
      { name: 'Bắp Rang Phô Mai', price: 79000, category: 'Bắp', description: 'Bắp rang vị phô mai' },
      { name: 'Coca Cola', price: 35000, category: 'Nước', description: 'Coca Cola lạnh 500ml' },
      { name: 'Pepsi', price: 35000, category: 'Nước', description: 'Pepsi lạnh 500ml' },
      { name: 'Trà Đào', price: 39000, category: 'Nước', description: 'Trà đào cam sả' },
      { name: 'Nước Suối', price: 20000, category: 'Nước', description: 'Nước suối Aquafina 500ml' },
      { name: 'Combo Solo', price: 89000, category: 'Combo', description: '1 Bắp Nhỏ + 1 Nước Lớn' },
      { name: 'Combo Couple', price: 149000, category: 'Combo', description: '1 Bắp Lớn + 2 Nước Lớn' },
      { name: 'Combo Family', price: 199000, category: 'Combo', description: '2 Bắp Lớn + 4 Nước Lớn' },
    ]);
    console.log(`🍿 Đã tạo ${concessions.length} sản phẩm bắp nước`);

    // ========================
    // TỔNG KẾT
    // ========================
    console.log('\n========================================');
    console.log('✅ SEED DATA HOÀN TẤT!');
    console.log('========================================');
    console.log(`👤 Users:       ${users.length}`);
    console.log(`🎬 Movies:      ${movies.length}`);
    console.log(`🏢 Cinemas:     ${cinemas.length}`);
    console.log(`🚪 Rooms:       ${rooms.length}`);
    console.log(`💺 Seats:       ${totalSeats}`);
    console.log(`🕐 Showtimes:   ${showtimes.length}`);
    console.log(`🍿 Concessions: ${concessions.length}`);
    console.log('========================================');
    console.log('📧 Tài khoản test:');
    console.log('   Admin: admin@cinebooking.vn / 123456');
    console.log('   User:  minh@gmail.com / 123456');
    console.log('   User:  nam@gmail.com / 123456');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed Error:', error);
    process.exit(1);
  }
};

seedData();
