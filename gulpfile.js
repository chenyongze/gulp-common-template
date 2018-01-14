var pkg = require('./package.json');
var gulp = require('gulp');
var clean = require('gulp-clean');
var header = require('gulp-header');
var sourcemaps = require('gulp-sourcemaps');
var less = require('gulp-less');
var csslint = require('gulp-csslint');
var autoprefixer = require('gulp-autoprefixer');
var cssnano = require('gulp-cssnano');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var imagemin = require('gulp-imagemin');
var gulpCopy = require('gulp-copy');
var htmlmin = require('gulp-htmlmin');
var rev = require('gulp-rev');
var revCollector = require('gulp-rev-collector');
var browserSync = require('browser-sync').create();
var gulpSequence = require('gulp-sequence');
var fileinclude = require('gulp-file-include');

var banner = '/*! <%= pkg.name %>-<%= pkg.version %> Generate by ' + new Date().toLocaleDateString() + '*/\n';

gulp.task('clean', function() {
	//read参数为false表示不读取文件的内容
	return gulp.src(['dist/', 'rev/'], { read: false })
		.pipe(clean());
});

gulp.task('less-dev', function() {
	return gulp.src('src/less/*.less')
		.pipe(less())
		.pipe(autoprefixer('last 6 version'))
		.pipe(csslint())
		// 显示CSS警告或错误
		.pipe(csslint.formatter())
		.pipe(gulp.dest('src/css'));
});

gulp.task('less', function() {
	return gulp.src('src/less/*.less')
		.pipe(sourcemaps.init())
		.pipe(less())
		.pipe(autoprefixer('last 6 version'))
		.pipe(csslint())
		// 显示CSS警告或错误
		.pipe(csslint.formatter())
		.pipe(cssnano())
		.pipe(header(banner, { pkg: pkg }))
		.pipe(sourcemaps.write())
		.pipe(rev())
		.pipe(gulp.dest('dist/css'))
		.pipe(rev.manifest())
		.pipe(gulp.dest('rev/css'));
});

gulp.task('js-dev', function() {
	return gulp.src('src/js/*.js')
		.pipe(jshint())
		.pipe(jshint.reporter('default'))
		.pipe(gulp.dest('src/js'));
});

gulp.task('js', function() {
	return gulp.src('src/js/*.js')
		.pipe(sourcemaps.init())
		.pipe(jshint())
		.pipe(jshint.reporter('default'))
		.pipe(uglify({ mangle: true }))
		.pipe(header(banner, { pkg: pkg }))
		.pipe(sourcemaps.write())
		.pipe(rev())
		.pipe(gulp.dest('dist/js'))
		.pipe(rev.manifest())
		.pipe(gulp.dest('rev/js'));
});

gulp.task('imagemin', function() {
	return gulp.src('src/img/*')
		// 取值范围：0-7（优化等级），级别越高，压缩次数越多，文件体积就可能越小，当然速度就越慢
		.pipe(imagemin({ optimizationLevel: 3 }))
		.pipe(rev())
		.pipe(gulp.dest('dist/img'))
		.pipe(rev.manifest())
		.pipe(gulp.dest('rev/img'));
});

gulp.task('vendor', function() {
	return gulp.src('src/vendor/**')
		.pipe(gulp.dest('dist/vendor'));
});

gulp.task('html:include', function () {
    return gulp.src('src/template/*.html')
        .pipe(fileinclude())
        .pipe(gulp.dest('app'));
});

gulp.task('html', function() {
	return gulp.src(['rev/**/*.json', 'src/*.html'])
		.pipe(htmlmin({
			collapseWhitespace: true,
			removeComments: true,
			collapseBooleanAttributes: true,
			removeEmptyAttributes: true,
			removeScriptTypeAttributes: true,
			removeStyleLinkTypeAttributes: true,
		}))
		.pipe(revCollector({
			// 设置replaceReved标识, 用来说明模板中已经被替换的文件是否还能再被替换,默认是false
			// replaceReved:true
		}))
		.pipe(gulp.dest('dist'));
});

gulp.task('rev-css', function() {
	return gulp.src(['rev/**/*.json', 'dist/css/*.css'])
		.pipe(revCollector())
		.pipe(gulp.dest('dist/css'));
});

gulp.task('rev-js', function() {
	return gulp.src(['rev/**/*.json', 'dist/js/*.js'])
		.pipe(revCollector())
		.pipe(gulp.dest('dist/js'));
});

gulp.task('bs', function() {
    browserSync.init({
        files: "**",
        open: "external",
        server: {
            baseDir: "src/",
            index: 'index.html',
        },
        port: 8889,
    });
});

// 调试
gulp.task('default', function() {
	gulp.run('bs');
	gulp.run('clean');
	gulp.watch('src/template/*.html', ['html:include']);
	gulp.watch('src/less/*/*.less', ['less-dev']);
	gulp.watch('src/js/*.js', ['js-dev']);
	gulp.watch('src/**').on('change', browserSync.reload);
	console.info(new Date().toLocaleTimeString() + ': Watching...');
});

// 发布
gulp.task('production',
	// 此插件除了方便控制任务顺序（前提是之前的每个任务都正常有return，否则无法控制任务顺序），还有并行执行的功能
	gulpSequence('clean', 'less', 'js', 'imagemin', 'vendor', 'html:include','html', 'rev-css', 'rev-js')
);