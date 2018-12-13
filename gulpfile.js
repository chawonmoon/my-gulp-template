var gulp = require('gulp');

var uglify = require('gulp-uglify')
    , concat = require('gulp-concat')
    , minifycss = require('gulp-minify-css')
    , minifyhtml = require('gulp-minify-html')
    , browserSync = require('browser-sync').create()
    , browserify = require('browserify')
    , source = require('vinyl-source-stream')
    , buffer = require('vinyl-buffer')
    , newer = require('gulp-newer')
    , imagemin = require('gulp-imagemin');

// 소스 루트 경로
var src ='./src', dist = './dist';

// 소스 세부 경로
var srcPath = {
    html: src + '/**/*.html',
    css: src + '/css/*.css',
    js: src + '/js/**/*.js',
    bundle: src + '/js/main.js',
    images: src + '/images/'
}, distPath = {
    html: dist+ '/',
    css: dist + '/css',
    js: dist + '/js',
    images: dist + '/images/'
};

// 병합파일명
var concatName = {
    css: 'dummy.min.css',
    js: 'dummy.min.js'
};

// dist 폴더를 기준으로 웹서버 실행
gulp.task('server', function (done) {
    browserSync.init({
        server: {
            baseDir: './dist'
        }
    });
    done();
});

// HTML 파일을 minify
gulp.task('minifyhtml', function (done) {
    gulp.src(srcPath.html, {since:gulp.lastRun('minifyhtml')}) //src 폴더 아래의 모든 html 파일을
        .pipe(minifyhtml()) //minify 해서
        .pipe(gulp.dest(distPath.html)) //위에 설정된 dist 폴더에 저장
        .pipe(browserSync.reload({stream:true})); //browserSync 로 브라우저에 반영
        //reload 메서드의 옵션으로 stream:true를 주었기 때문에 변경된 파일만 stream 으로 브라우저에 전송되어 리프레시 없이도 반영이 가능한 경우 리프레시 없이 반영
    done();
});

// CSS 파일을 minify
gulp.task('minifycss', function (done) {
    gulp.src(srcPath.css, {sourcemaps:true, since:gulp.lastRun('minifycss')}) //css 폴더의 *.css 파일을
        .pipe(concat(concatName.css)) //위에 설정된 파일명으로 모두 병합한 뒤에,
        .pipe(minifycss()) //포함되어 있는 @import를 분석해서 하나의 파일로 병합하고 minify 해서
        .pipe(gulp.dest(distPath.css)) //위에 설정된 dist 폴더에 저장
        .pipe(browserSync.reload({stream:true})); //browserSync 로 브라우저에 반영
    done();
});

// JavaScript minify
gulp.task('uglify', function (done) {
    browserify({entries: [srcPath.bundle], debug: true})
        .bundle() //browserify로 번들링
        .on('error', function (err) {
            //browserify bundling 과정에서 오류가 날 경우 gulp가 죽지않도록 예외처리
            console.error(err);
            this.emit('end');
        })
        .pipe(source(concatName.js)) //vinyl object 로 변환
        .pipe(buffer()) //buffered vinyl object 로 변환
        .pipe(uglify()) //js minify
        .pipe(gulp.dest(distPath.js)) //위에 설정된 dist 폴더에 저장
        .pipe(browserSync.reload({stream:true}));
    done();
});

// 이미지 압축
gulp.task('imagemin', function (done) {
    gulp.src(srcPath.images+'*')
        .pipe(newer('src')) //src폴더내부의 변경이 있는 파일을 확인
        .pipe(imagemin({ 
            optimizationLevel: 5, progressive: true, interlaced: true 
        })) //이미지 최적화
        .pipe(gulp.dest(srcPath.images)) //최적화 이미지를 src에 출력
        .pipe(gulp.dest(distPath.images)); //동시에 dist에도 출력
    done();
});

// 파일 변경 감지
gulp.task('watch', function (done) {
    //src 디렉토리 안에 html 확장자를 가진 파일이 변경되면 minifyhtml task 실행
    gulp.watch(srcPath.html, gulp.series('minifyhtml'));
    //src 디렉토리 안에 css 확장자를 가진 파일이 변경되면 minifycss task 실행
    gulp.watch(srcPath.css, gulp.series('minifycss'));
    //src 디렉토리 안에 js 확장자를 가진 파일이 변경되면 uglify task 실행
    gulp.watch(srcPath.js, gulp.series('uglify'));
    done();
});

// gulp를 실행하면 default 로 server task와 watch task, imagemin task를 실행
// series = 순차
// parallel = 동시 or 병렬(실행은 동시에 시작되지만 처리속도에 따라 종료시점이 달라진다)
gulp.task('default', gulp.series('server', 'watch', 'imagemin'));