import gulp from "gulp";
import minifycss from 'gulp-minify-css';
import minifyhtml from 'gulp-minify-html';
import plumber from "gulp-plumber";
import gulpSass from "gulp-sass";
import sourcemaps from "gulp-sourcemaps";
import autoprefixer from "autoprefixer";
import postCss from "gulp-postcss";
import rename from "gulp-rename";
import dependents from "gulp-dependents";
import bro from "gulp-bro";
import minify from "gulp-minify";
import browserSync from 'browser-sync';
import dartSass from "dart-sass";
import babelify from "babelify";
import fs from 'fs';
import path from 'path';

browserSync.create()

// 에러 발생 시 에러 로그 출력
const onErrorHandler = (error) => console.log(error);

// 소스 루트 경로
const src ='./src'
const dist = './dist';

// 소스 세부 경로
const srcPath = {
    html: src + '/**/*.html',
    scss: src + '/**/*.scss',
    js: src + '/js/main.js',
    images: src + '/images'
}
const distPath = {
    html: dist,
    css: dist,
    js: dist + '/js',
    images: dist + '/images'
};

// 빌드 폴더 삭제
gulp.task('clear', async ()=>{
    const del = await import('del');
    await del.deleteAsync(['dist']);
})

// dist 폴더를 기준으로 웹서버 실행
gulp.task('server',  (done) => {
    browserSync.init({
        server: {
            baseDir: dist // 웹서버 root폴더 경로 지정
        },
        browser: ["chrome", "firefox"] // 원하는 브라우저로 실행한다. 현재는 크롬과 파이어폭스로 실행
    });

    done();
});

// HTML minify
gulp.task('markup',  (done) => {
    gulp.src(srcPath.html, {since: gulp.lastRun('markup')}) //src 폴더 아래의 모든 html 파일을
        .pipe(minifyhtml()) //minify 해서
        .pipe(gulp.dest(distPath.html)) //위에 설정된 dist 폴더에 저장
        .pipe(browserSync.reload({stream:true})); //browserSync 로 브라우저에 반영
        //reload 메서드의 옵션으로 stream:true를 주었기 때문에 변경된 파일만 stream 으로 브라우저에 전송되어 리프레시 없이도 반영이 가능한 경우 리프레시 없이 반영

    done();
});


// CSS minify
gulp.task('styles',  (done) => {
    const sass = gulpSass(dartSass);                        // ECMAScript 모듈(최신 Node.js 14 이상에서 지원됨)에서 사용하기 위해 선언
    const options = {
        scss : {
            outputStyle: "expanded",                            // 컴파일 스타일: nested(default), expanded, compact, compressed
            indentType: "space",                                // 들여쓰기 스타일: space(default), tab
            indentWidth: 2,                                     // 들여쓰기 칸 수 (Default : 2)
            precision: 8,                                       // 컴파일 된 CSS 의 소수점 자리수 (Type : Integer , Default : 5)
            sourceComments: true,                               // 주석 제거 여부 (Default : false)
            compiler: dartSass,                                 // 컴파일 도구
        },
        postcss: [ autoprefixer({
            overrideBrowserslist: 'last 2 versions',            // 최신 브라우저 기준 하위 2개의 버전까지 컴파일
        }) ]
    };

    gulp.src(
        srcPath.scss,                          // 컴파일 대상 scss파일 찾기
        { since: gulp.lastRun('styles') }                          // 변경된 파일에 대해서만 컴파일 진행
    ).pipe( plumber({errorHandler:onErrorHandler}) )         // 에러 발생 시 gulp종료 방지 및 에러 핸들링
        // *.css 생성
        .pipe( dependents() )                                   // 현재 스트림에 있는 파일에 종속되는 모든 파일을 추가
        .pipe( sourcemaps.init() )                              // 소스맵 작성
        .pipe( sass(options.scss).on('error', sass.logError) )  // scss 옵션 적용 및 에러 발생 시 watch가 멈추지 않도록 logError 설정
        .pipe( postCss(options.postcss) )                       // 하위 브라우저 고려
        .pipe( sourcemaps.write() )                             // 소스맵 적용
        .pipe( gulp.dest(distPath.css) )                       // 컴파일 후 css파일이 생성될 목적지 설정
        // *.min.css 생성
        .pipe( minifycss() )                                    // 컴파일된 css 압축
        .pipe( rename({ suffix: '.min' }) )                     // 압축파일 *.min.css 생성
        .pipe( sourcemaps.write() )                             // 소스맵 적용
        .pipe( gulp.dest(distPath.css) )
        .pipe(browserSync.reload({stream:true}));

    done();
});

// JavaScript minify
gulp.task('javascript', (done) => {
    gulp.src([
        srcPath.js                                  // 트렌스파일 대상 경로 (util.js 는 main.js 에 import 하기 때문에 호출 안함)
    ])
        .pipe( sourcemaps.init({ loadMaps: true }) )                // 소스맵 초기화 (기존의 소스 맵을 유지하고 수정하는 데 사용하기 위해 옵션 설정)
        .pipe( bro({                                                // 트렌스파일 시작
            transform: [
                babelify.configure({ presets: ['@babel/preset-env'] }), // ES6 이상의 문법을 일반 브라우저가 코드를 이해할 수 있도록 변환
                [ 'uglifyify', { global: true } ]                       // 코드 최소화 및 난독화
            ]
        }) )
        .pipe( sourcemaps.write('./') )                             // 소스맵 작성
        .pipe(minify({                                              // 트렌스파일된 코드 압축 및 min 파일 생성
            ext: { min: '.min.js' },                                  // 축소된 파일을 출력하는 파일 이름의 접미사 설정
            ignoreFiles: ['-min.js']                                  // 해당 패턴과 일치하는 파일을 축소하지 않음
        }))
        .pipe( gulp.dest(distPath.js) )

    done();
});

// 이미지 빌드폴더로 복사
gulp.task('images', async (done) => {
    // 대상 폴더 생성
    await fs.promises.mkdir(distPath.images, { recursive: true });

    // 원본 폴더의 파일 목록 읽기
    const entries = await fs.promises.readdir(srcPath.images, { withFileTypes: true });

    // 각 항목에 대해 반복
    for (let entry of entries) {
        const srcPaths = path.join(srcPath.images, entry.name);
        const destPaths = path.join(distPath.images, entry.name);

        if (entry.isDirectory()) {
            // 디렉토리인 경우 재귀적으로 함수 호출
            await copyFolder(srcPaths, destPaths);
        } else {
            // 파일인 경우 복사
            await fs.promises.copyFile(srcPaths, destPaths);
        }
    }

    done();
});

// 파일 변경 감지
gulp.task('watch', (done) => {
    //src 디렉토리 안에 html 확장자를 가진 파일이 변경되면 minifyhtml task 실행
    gulp.watch('src/**/*.html', gulp.series('markup'));
    //src 디렉토리 안에 css 확장자를 가진 파일이 변경되면 minifycss task 실행
    gulp.watch('src/css/**/*.scss', gulp.series('styles'));
    //src 디렉토리 안에 js 확장자를 가진 파일이 변경되면 uglify task 실행
    gulp.watch('src/js/**/*.js', gulp.series('javascript'));

    done();
});

// gulp를 실행하면 default 로 server task와 watch task, imagemin task를 실행
// series = 순차
// parallel = 동시 or 병렬(실행은 동시에 시작되지만 처리속도에 따라 종료시점이 달라진다)
// 순차적으로 실행되어야 하는 task 그룹
const prepare = gulp.series([ 'clear', 'images' ]);

// 위 prepare 실행 완료 후 순차적으로 실행되어야 하는 task 그룹
const assets = gulp.series([ 'markup', 'styles', 'javascript' ]);

// 동시에 여러 개의 task가 실행되어야 하는 그룹 (병렬로 실행)
const live = gulp.parallel([ 'watch', 'server' ]);


// export (gulp 실행 명령어) ----------------------------------------

// gulp build 실행 (prepare 실행 후 assets 실행) - build만 실행
export const build = gulp.series([ prepare, assets ]);

// gulp dev 실행 (build 실행 후 live 실행) - build 실행 후 live 실행
export const dev = gulp.series([ build, live ]);

export const image = gulp.series(['images'])