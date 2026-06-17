const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const Review = require('../models/Review');
const Showtime = require('../models/Showtime');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ========================
// @desc    Tra cứu & Lọc phim
// @route   GET /api/movies
// @access  Public
// @query   keyword, genre, country, rated, sort, page, limit
// ========================
const getMovies = async (req, res) => {
  try {
    const {
      keyword,
      genre,
      country,
      rated,
      status,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const filter = {};

    // ----- Tìm kiếm theo từ khóa (tên phim hoặc diễn viên) -----
    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { cast: { $regex: keyword, $options: 'i' } },
      ];
    }

    // ----- Lọc theo thể loại -----
    if (genre) {
      // Hỗ trợ lọc nhiều thể loại: ?genre=Hành Động,Kinh Dị
      const genres = genre.split(',').map((g) => g.trim());
      filter.genre = { $in: genres };
    }

    // ----- Lọc theo quốc gia -----
    if (country) {
      filter.country = { $regex: country, $options: 'i' };
    }

    // ----- Lọc theo phân loại lứa tuổi -----
    if (rated) {
      filter.rated = rated;
    }

    // ----- Lọc theo trạng thái phim -----
    if (status) {
      filter.status = status;
    } else {
      // Mặc định: hiển thị phim đang chiếu nếu không nhập gì
      if (!keyword && !genre && !country && !rated) {
        filter.status = 'now_showing';
      }
    }

    // ----- Sắp xếp -----
    let sortOption = {};
    switch (sort) {
      case 'rating_desc':
        sortOption = { ratingAverage: -1 };
        break;
      case 'rating_asc':
        sortOption = { ratingAverage: 1 };
        break;
      case 'release_newest':
        sortOption = { releaseDate: -1 };
        break;
      case 'release_oldest':
        sortOption = { releaseDate: 1 };
        break;
      case 'title_asc':
        sortOption = { title: 1 };
        break;
      case 'title_desc':
        sortOption = { title: -1 };
        break;
      default:
        sortOption = { releaseDate: -1 }; // Mặc định: mới nhất trước
    }

    // ----- Phân trang -----
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 12;
    const skip = (pageNum - 1) * limitNum;

    // ----- Truy vấn -----
    const [movies, totalCount] = await Promise.all([
      Movie.find(filter).sort(sortOption).skip(skip).limit(limitNum),
      Movie.countDocuments(filter),
    ]);

    // Nếu tìm không thấy phim nào
    if (movies.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Không có phim phù hợp với yêu cầu của bạn!',
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
      message: `Tìm thấy ${totalCount} phim.`,
      data: movies,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('❌ Get Movies Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

// ========================
// @desc    Lấy chi tiết phim theo ID
// @route   GET /api/movies/:id
// @access  Public
// ========================
const getMovieById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'movieId khong hop le.',
      });
    }

    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phim.',
      });
    }

    // Lấy danh sách đánh giá kèm thông tin user
    const reviews = await Review.find({ movie: req.params.id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    // Lấy danh sách suất chiếu sắp tới
    const showtimes = await Showtime.find({
      movie: req.params.id,
      timeStart: { $gte: new Date() },
    })
      .populate('cinema', 'name address')
      .populate('room', 'name typeRoom')
      .sort({ timeStart: 1 });

    res.status(200).json({
      success: true,
      data: {
        movie,
        reviews,
        reviewCount: reviews.length,
        showtimes,
      },
    });
  } catch (error) {
    console.error('❌ Get Movie By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

// ========================
// @desc    Đánh giá phim (chọn sao + nhận xét)
// @route   POST /api/movies/:id/reviews
// @access  Private (cần đăng nhập)
// ========================
const createReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const movieId = req.params.id;
    const userId = req.user._id;

    // Kiểm tra phim tồn tại
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
        message: 'Không tìm thấy phim.',
      });
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn số sao từ 1 đến 5.',
      });
    }

    // Kiểm tra đã đánh giá phim này chưa (1 user chỉ đánh giá 1 lần/phim)
    const existingReview = await Review.findOne({
      user: userId,
      movie: movieId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đánh giá bộ phim này rồi. Mỗi người chỉ được đánh giá 1 lần.',
      });
    }

    // Tạo review mới
    const review = await Review.create({
      user: userId,
      movie: movieId,
      rating,
      comment: comment || '',
    });

    // Populate user info để trả về
    await review.populate('user', 'name email');

    // Lấy lại movie đã cập nhật ratingAverage (được tính bởi post-save hook)
    const updatedMovie = await Movie.findById(movieId);

    res.status(201).json({
      success: true,
      message: 'Đánh giá phim thành công!',
      data: {
        review,
        updatedRating: updatedMovie.ratingAverage,
      },
    });
  } catch (error) {
    // Xử lý lỗi duplicate key (trường hợp race condition)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đánh giá bộ phim này rồi.',
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }

    console.error('❌ Create Review Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

// ========================
// @desc    Lấy danh sách đánh giá của 1 phim
// @route   GET /api/movies/:id/reviews
// @access  Public
// ========================
const getMovieReviews = async (req, res) => {
  try {
    const movieId = req.params.id;
    const { page = 1, limit = 10 } = req.query;

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
        message: 'Không tìm thấy phim.',
      });
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [reviews, totalCount] = await Promise.all([
      Review.find({ movie: movieId })
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Review.countDocuments({ movie: movieId }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
        },
      },
    });
  } catch (error) {
    console.error('❌ Get Movie Reviews Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

module.exports = {
  getMovies,
  getMovieById,
  createReview,
  getMovieReviews,
};
