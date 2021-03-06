# JH Music Player
_(former name as jh-lrc)_
JH Music Player use _Modern Browsers_ feature *AudioContext* and *FileReader* to make a web-base music player that can load lyric, audio, image[album cover] files from local file system.    
You can simply drag files to the browser when you're using desktop browsers, or use _File-Input button_ to add your files on your phones.     

Current UI design is imitating one of the most popular music players called 'Cloud Music' from NetEase.    
Icons come from [Material Icons](https://design.google.com/icons/) by Google, and [Octicons](https://github.com/primer/octicons) by GitHub. Generated as font using [IcoMoon App](https://icomoon.io/app).   
_(this project was first started as a lyric file parser and display.)_    

visit [JH Music Player](http://music.jonham.cn/) (http://music.jonham.cn/) to enjoy your music.    
And you're welcome to fork and issue whatever come up in your mind.

<hr>

## Features going to add

1. **WebSocket**, with the help of _[Pusher](https://pusher.com/)_: makes **Remote Controls**.
3. generate music (or noises) by pure JavaScript (*AudioContext*): DJ music playing platform
4. analyse and regnize *beats* and *tones*.
5. Audio recording using **WebRTC** or AudioContext output
6. scripts making to Video or audio: add time tags and fix accuration.
7. more **UI** besides NetEase one.
9. **Online Engine** lyric search Engine or Song message search Engine, further album cover search engine
11. **"Functional HTML DOM Elements"** constructions


- [x] **Event-Driven** or **State-Driven** mode.
- [x] **Canvas**: visual display of music.
- [x] **History API** for using return button on browsers to route between each page and menu
- [x] **Alternate Plan** make AJAX audio loading as a alternate plan when user device don't support AudioContext    

<hr>

## Features or Functions need tests
01. **Supports for Browsers**: both Wechat and UC won't crack, but with same error message
    - [x] Wechat(enbeded QQ Browser): auto crack down    
        BUGS: attachNodeToElement.js:300 drag.js:73
    - [x] UC browser : unique input[type=file], crack down when select any kind of files
        BUGS: attachNodeToElement.js:300 drag.js:73    
        **Solution**: the crack down on both browser may due to the fact that browser receive unhandled errors.I've catch errors both in rangeTime and rangeVolume.
    - [x] onResize() don't work on browser don't support AudioContext
02. **Song** and **SongList**
    - [ ] **!IMPROTANT** songlist occur when playing in mobile device, which loading file will take more time, that all songs don't play but just looping between others
    - [x] songlist **mode** detail completion
    - [x] play multi songs when user click .nextSong btn for many times before last song asynchronous actions ready
    - [x] songlist .next, .play, .pause, .stop ...
    - [x] songlist .playNext, .playPre and related songlist.next and songlist.pre
    - [x] songlist: play-modes, counts
    - [x] song.timeOffset records ctx.currentTime when song begin
    - [x] requestAnimationFrame() to update audio time19. - [ ] open-screen animation :::: need more tests
03. **Event-Driven** Emitter need add listenTo or others method


<hr>


## Bugs need fix

06. **touch** events:
    - [x] cancel browsers default gestures detection ( e.preventDefault, e.stopPropagation )
    - [ ] prevent continuing clicks
    - [ ] wait and react until animations stop
07. **lyric** and cover
    - [x] lyric loader and _timeupdate_ event for AudioContext decoded audio
    - [x] lyric Empty lines handling
    - [x] empty lines display: filled with '...'
    - [ ] lyric and album image load when another start
    - [ ] lyric parser for compressed lyric files
09. main parts display: Pages, menus, sidebar
    - [x] #sidebar-left bottom position
    - [x] #page-comments .btn-back position to highlight
    - [x] FOR ALL: add max-height or max-width to each
    - [ ] FOR ALL: display style and position when on Desktop
12. **Integration**
    - [ ] bind up related blocks
13. **Canvas** for Audio Visualization
    - [ ] animation delay on poor supported Devices
    - [ ] more display styles [black, white]
14. **History API**
    - [x] basic pushState() return to PageSystem and close menu or sidebar
    - [x] states interruptions: close menu will also return to pageSystem
    - [ ] destop alt+arrow will cause some faults when state overwrite
10. **Supports** among browsers
    - [x] controls in mainpage display in iPhone4 (narrow in width)
    - [ ] supports information for all kind of Browsers
    - [ ] supports for Devices like iPhone or other weak supports of HTML5, to provide a alternate options to load a remote file and lyric to enjoy the player
15. **Alternate Plan**
    - [x] for devices don't support import media files and lyric files (like iPhone)
    - [ ] for devices don't support AudioContext
03. **FullScreen** API
    - [x] FullScreen API for devices
    - [x] FullScreen Event listeners on other state change
    - [x] to hide FullScreen button when is not available
01. main DOM elements display
    - [x] `<input type='file>` display
    - [x] highlight Ranges objects
    - [x] #page-comments needs basic framework setup
02. **dConsole** window display
    - [x] dConsole display when button 'show console' was pressed
    - [x] display in FullScreen mode. [ change as a float window on the head of viewport]
04. **Icons** and Display
    - [x] Icons for each Page and Menu items
    - [x] sub-controls bar in #page-system ( btn-play circle display)
    - [x] zip up _svg_ files of icon
    - [x] images and icons preload
05. **Events**
    - [x] rangeTime throw error when drag event happened before the audio is playing:SOLUTION:just unbind the function when there is no audio playing
08. **control** funcs and buttons
    - [x] play, nextSong buttons to work on SongList
    - [x] mute and volume controls on SongList
11. **mask layer**
    - [x] mask layer for avoiding mistake touches and clicks
