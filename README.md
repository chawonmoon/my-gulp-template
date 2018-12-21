# my-gulp-template (ES5)
1. Gulp 셋팅을 Study겸 정리  
1. `gulpfile.js`을 ES5스펙으로 작성
1. `SCSS`와 `Babel`은 사용하지 않음

## Task & 각 Section 설명

### 1. 모듈 호출
>Gulp 사용 및 자동화를 위해 필요한 모듈을 변수에 선언

```javascript
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
```

### 2. 전체 경로 설정
>Gulp 셋팅전체에 사용되는 경로를 미리 한곳에 모아 설정.  
>개인취향으로 객체에 담아 사용함

```javascript
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
```

### 3. browser-Sync
>로컬에서 결과물을 확인하기 위해 가상의 웹서버를 띄워주는 Task  
>dist 폴더를 기준으로 웹서버 실행

```javascript
gulp.task('server', function (done) {
    browserSync.init({
        server: {
            baseDir: './dist' // 웹서버 root폴더 경로 지정
        }
    });
    done();
});
```

### 4. gulp-minify-html
>HTML 파일을 minify(소스압축) 해주는 Task  
>Front-end 작업이 아닌 일반적인 웹퍼블리싱 작업에선 개발자와의 협업을 위해 minify는 하지 않음

```javascript
gulp.task('minifyhtml', function (done) {
    gulp.src(srcPath.html, {since:gulp.lastRun('minifyhtml')}) //src 폴더 아래의 모든 html 파일을
        .pipe(minifyhtml()) //minify 해서
        .pipe(gulp.dest(distPath.html)) //위에 설정된 dist 폴더에 저장
        .pipe(browserSync.reload({stream:true})); //browserSync 로 브라우저에 반영
    done();
});
```
>reload 메서드의 옵션으로 `stream:true`선언 변경된 파일만 stream 으로 브라우저에 전송,  
>새로고침 없이도 반영이 가능한 경우 즉시 반영됨

### 5. gulp-minify-css / gulp-concat
>CSS 파일을 minify(소스압축) 해주는 Task  
>파일 내용도 concat(병합) 해줌

```javascript
gulp.task('minifycss', function (done) {
    gulp.src(srcPath.css, {sourcemaps:true, since:gulp.lastRun('minifycss')}) //css 폴더의 *.css 파일을
        .pipe(concat(concatName.css)) //위에 설정된 파일명으로 모두 병합한 뒤에,
        .pipe(minifycss()) //포함되어 있는 @import를 분석해서 하나의 파일로 병합하고 minify 해서
        .pipe(gulp.dest(distPath.css)) //위에 설정된 dist 폴더에 저장
        .pipe(browserSync.reload({stream:true})); //browserSync 로 브라우저에 반영
    done();
});
```

### 6. gulp-uglify
>JavaScript 파일을 minify(소스압축) 해주는 Task  
>파일 내용을 bundling(번들링) / concat(병합) 해줌

```javascript
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
```

### 7. gulp-imagemin / gulp-newer
>이미지(gif/jpg/png/svg) 파일을 minify(압축) 해주는 Task  
>src폴더와 dist폴더에 같이 출력 해줌  
>`gulp-newer`로 이미지에 변경이 있는지를 확인한다

```javascript
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
```

### 8. watch
>파일 변경을 감시(`watch`)하여 파일에 변경이 있을 시 등록된 Task를 즉시 재실행

```javascript
gulp.task('watch', function (done) {
    //src 디렉토리 안에 html 확장자를 가진 파일이 변경되면 minifyhtml task 실행
    gulp.watch(srcPath.html, gulp.series('minifyhtml'));
    //src 디렉토리 안에 css 확장자를 가진 파일이 변경되면 minifycss task 실행
    gulp.watch(srcPath.css, gulp.series('minifycss'));
    //src 디렉토리 안에 js 확장자를 가진 파일이 변경되면 uglify task 실행
    gulp.watch(srcPath.js, gulp.series('uglify'));
    done();
});
```

### 9. 기본 Task 설정
>`$ gulp` 명령을 실행하면 기본 Task가 실행되도록 선언
 
```javascript
// gulp를 실행하면 default로 'uglify', 'minifycss', 'minifyhtml', 'imagemin' 순차적으로 빌드(build)
// 빌드(build) 후 병렬로 'watch', 'server' 실행
// series = 순차 (먼저 실행된 task가 끝나야 다음 task가 실행)
// parallel = 동시 or 병렬 (실행은 동시에 시작되지만 처리속도에 따라 종료시점이 달라진다)
gulp.task('default', gulp.series('uglify', 'minifycss', 'minifyhtml', 'imagemin', gulp.parallel('watch', 'server')));
```

## I think...
>1. 기본적으로 JavaScript는 어느정도 알아야 셋팅이 가능하고, `Node.js / NPM / 모듈시스템`의 대략적인 개념을 안다면 훨신 효율이 좋을것으로 생각된다.  
>1. 3.9대 버전에서 4.0대 버전으로 넘어오면서 구문과 스펙의 변경이 생겨 조금 삽질함.  

## AS-IS
>1. ES6로 재작업 
>1. `imagemin` `browserify` 설정과 `browser-sync`에 대한 이해가 더 필요함.  
>1. `browserify`를 포함하긴 했으나 사실 JS 번들링에 대한 필요성에 대해서는 잘모르겠다, 아무래도 `Babel`을 사용해보면 감이 오지 않을까 싶다  
>1. `browser-sync`로 서버를 실행시킬때 기본 실행브라우저를 바꾸는 방법을 옵션에서 찾아야함.
 