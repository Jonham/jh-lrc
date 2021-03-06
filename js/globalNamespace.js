// contains all GLOBAL objects, do not exposed directly to window
(function(w) {
    w.NS = {};
    // add anything you like under NS.something
    //==> declare at the beginning of this file,
    //==> add to NS at the bottom

    //utils: transform time format from 100 to 01:40
    var formatTimestamp = function formatTimestamp(time) {
        // current time show like 01:01 under the play&pause button
    	var num = parseInt(time),
            sec = num % 60,
            min = parseInt( num / 60);
        var mtTwo = function(n) {
            return n < 0? '00':
                     n < 10? '0'+n: ''+n; }; // more than two digits

    	return mtTwo(min) + ":" + mtTwo(sec);
    };
    //utils: preloadImage
    var preloadImage = function( urlArray, loadedCallback ) {
        if (!_.isArray(urlArray)) { return false; }

        var startTime = +new Date(), success = [], fail = [];
        var process = function(index) {
            if (index === urlArray.length - 1) {
                dConsole.log('Images loaded: success x ' + success.length + "|| fail x " + fail.length);

                loadedCallback && loadedCallback();
            }
        };
        _.each( urlArray ,function(url, index) {
            var i = new Image();
            i.src = url;
            i.onload = function() {
                success.push({
                    url: url,
                    time: +new Date()
                });
                process(index);
            };
            i.onerror = function(e) {
                fail.push({
                    url: url,
                    time: +new Date()
                });
            };
        });
    };
    //utils: test if file isFile
    var isFile = function( file ) { return !!(typeof(file) === 'object' && file.size >= 0 && file.toString && file.toString() === '[object File]'); };
    //utils: compare file
    var isOneFile = function( fileA, fileB ) {
        if (isFile(fileA) && isFile(fileB)) {
            if (fileA.size === fileB.size && fileA.name === fileB.name) {
                return true;
            }
        }

        return false;
    };


    // desktop browsers don't support touch events
    var isMobile = function() { return null === document.ontouchend; };
    // another way: not completed
    var isMobile1 = function() {
        var ug = navigator.userAgent;
        var result = ug.search(/windows|x11|Mac.*(^iphone)/ig);
        dConsole.log(result === -1? 'Use input[type=file] to add files' : 'Drag&Drop files onto me!');
        // return true if userAgent fulfill desktop-browser conditions
        //   and browser support AudioContext() [webkitAudioContext() included]
        return NS.supports.audioContext && result !== -1;
    };

    // FullScreen
    var supportFullscreen = (function(docElem) {
        var fullscreen = cancelFullscreen = null;
        var fsWays = ['requestFullScreen', 'mozRequestFullScreen', 'webkitRequestFullScreen'],
            cfsWays = ['cancelFullscreen', 'mozCancelFullScreen', 'webkitCancelFullScreen'];
        var requestFullScreen = function( elem ) {
            for (var index = 0; index < fsWays.length; index++) {
                if (docElem[ fsWays[index] ]) {
                    fullscreen = fsWays[index]; break;
                }
            }
            if (!fullscreen) { return false; }
            return elem[fullscreen]();
        };
        var cancelFullScreen = function() {
            for (var index = 0; index < cfsWays.length; index++) {
                if (document[ cfsWays[index] ]) {
                    cancelFullscreen = cfsWays[index]; break;
                }
            }
            return document[cancelFullscreen]();
        }
        return {
            requestFullScreen: requestFullScreen,
            cancelFullScreen:  cancelFullScreen
        };
    })(document.documentElement);

    // a complementation of Events
    var Emitter = function() {
            // JH-bug: create 'event' listener
            var _events = {};
            this.addEvent = this.on = function( eventType,listener ) {
                var eventArray = eventType.split(' ');
                // handle each eventtype  that in 'play pause'
                _.each(eventArray, function(e) {
                    if (!_events[ e ]) {
                        _events[e] = [];
                        _events[e].push( listener );
                    }
                    else {
                        var list = _events[e];
                        var alreadyIn = false;
                        _.each(list, function(fn) {
                            if (listener === fn) { alreadyIn = true; }
                        });

                        if (! alreadyIn ) {
                            list.push(listener);
                        }
                    }
                });
            };
            this.trigger = function( eventType,msg ) {
                var list = _events[ eventType ];
                if (!list || list.length === 0) { return false; }
                _.each(list, function(fn) {
                    if (!_.isObject(msg)) {
                        fn( {type: eventType} );
                    }
                    else {
                        fn( _.extend(msg, {type: eventType}) );
                    }
                });
            };
            this.removeEvent = this.off = function( eventType,listener ) {
                var eventArray = eventType.split(' ');
                _.each(eventArray, function(e) {
                    var list = _events[ e ];
                    if (!list || list.length === 0) { return false; }

                    if (listener === undefined) { _events[ e ] = []; return false;}
                    _events[ e ] = _.filter(list,
                        function(fn) {
                            if (fn !== listener) { return true; }
                        });
                });
            };
            return this;
    };
    // a static method on Emitter
    Emitter.attachTo = function( o ) {
        if(!_.isObject(o)) { return false; }
        Emitter.call(o);
        return o;
    };


    var LocalFileList = function() {

        // FileContainer will store the true data
        var FileContainer = function() {
            this._array = [];
            return this;
        };
        FileContainer.prototype = {
            add: function(str) { this._array.push(str); return this; },
            remove: function(str) {
                var a = this._array;
                this._array = _.filter(a, // remove those equal to str
                    function(value){ return value !== str; });
                return this;
            },
            length: function() { return this._array.length; }
        };

        // Index Tree store all file related message and index to each subtree
        var IndexTree = function() {
            // name artist album
            this._tree = {};
            return this;
        };
        IndexTree.prototype = {
            add: function(file, group, index) {
                var name = file.name,
                    size = file.size,
                    tree = this._tree;

                if (tree[name] && tree[name].size === size) { // already load one: JH-bugs: sizes
                    dConsole.log("skip " + name + ": already had one.");

                    return false;
                }// already load one
                else if( tree[name] ) { // with different size, as a new object, name end with #i
                    // JH-bugs: here should count all file, that share a same name and compare their size
                    var num = tree[name].count;
                    if (typeof(num) === 'number') {
                        tree[ name + '#' + (++num)] = {
                            name: name,
                            num: num, // the number of this in those songs share the name
                            size: size,
                            group: group,
                            index: index
                        };
                        return true;
                    }
                    else { // this maybe the second one
                        num = 1;
                        tree[ name ].count = 2;
                        tree[ name ].num = num;
                        tree[ name + '#' + (++num)] = {
                            name: name,
                            num: num, // the number of this in those songs share the name
                            size: size,
                            group: group,
                            index: index
                        };
                        return true;
                    }
                } // different size
                else { // this is the first one on this name
                    tree[ name ] = {
                        name: name,
                        size: size,
                        group: group,
                        index: index
                    };
                    return true;
                }
            },
            set: function() {},
            get: function() {},
            remove: function() {},
        };
        this.audio =  new FileContainer();
        this.lyric =  new FileContainer();
        this.image =  new FileContainer();

        // this _tree records all
        this._treeTitle = {};
        this._treeArtist = {};
        this._treeAlbum = {};

        return this;
    };
    LocalFileList.prototype = {
        AUDIO : 0,
        LYRIC : 1,
        IMAGE : 2,

        add: function(file, type) {
            switch ( type ) {
                case this.AUDIO:
                    this.audio.add(file);
                    var index = this.audio.length - 1;
                    break;
                case this.LYRIC:
                    this.lyric.add(file);
                    var index = this.audio.length - 1;
                    break;
                case this.IMAGE:
                    this.image.add(file);
                    var index = this.audio.length - 1;
                    break;
                default:

            }
        }
    };


    // AudioContext
    var supportAudioContext = function() {
        // JH-debuging make browser act like mobile one which support no AudioContext
        // return false;
        return !!window.AudioContext;
    };
    // this contains Song(), SongList()
    // create
    var audioCtx = function() { // Global NameSpace AudioContext Initial
        if (!supportAudioContext()) {
            // alert("WoW! your browser doesn't support the tech: AudioContext.\n我的天！ 你的浏览器居然不支持音频解析，赶紧升级到最新版本!\n或者，你可以尝试用QQ浏览器, Firefox 或者 Chrome浏览器。\n要更好地体验黑科技，建议您使用电脑版的浏览器。");
            alert("WoW! your browser doesn't support the tech: AudioContext.\nFor more joy, please open this player in Destop Browsers.");
            // polyfill NS.audio.ctx...
            return false;
        }

        var ctx = new AudioContext();
        var currentPlayingSong = null;
        var headGain = ctx.createGain(); // this gain works as the headoffice to control all volume of inputs
            headGain.connect(ctx.destination);

        // this works as Center controller
        var controller = {
            play: function() {
                var currentPlayingSong = NS.audio.currentPlayingSong;
                if (currentPlayingSong.PAUSED) {
                    currentPlayingSong.play();
                }
                return currentPlayingSong;
            },
            pause: function() {
                var currentPlayingSong = NS.audio.currentPlayingSong;

                NS.audio.currentPlayingSong.pause();
                return currentPlayingSong;
            },
            next: function() {},
            stop: function() {},
            mute: function() {
                headGain.gain.value = 0;
            },
            songEnd: function(song) {
                NS.audio.songlist.playNext();
            },
        };

        // Song wrapper for each song

        // "I think maybe I just quit and go back home to make noodles."
        // I think this gay works like a Promise
        var Song = function Song( file ) {
            var me = this;
            if (me === window) { return new Song( file ); }

            me.constructor = Song;

            me.states = {
                init: false,
                analyseFilename: false,
                readFile: false,
                decode: false,
                createBufferSource: false,
            };

            me.context = ctx; // AudioContext
            me.ASYNCHRONOUS = false;    // is this song doing asynchronous works

            // init
            me._file = null;
            me.fileName = me.size = me.type = null; // messages from File
            me.title = me.artist = null;
            // getBuffer
            me._buffer = null;
            // decode
            me._audioBuffer = null;
            // createBufferSource
            me.output = me.bufferSourceNode = me.gainNode = null;
            // message after audio decode
            me.duration = null;
            // playing states
            me.PAUSED = false;
            me.STOPPED = false;

            // wrapped as an Audio object
            me.currentTime = 0; // like audio
            me.timeOffset = 0;  // offset between audio.currentTime and ctx.currentTime
            me.__timer = null;  // for requestAnimationFrame to store ID
            me.__TIMEUPDATE = false;

            // if get argument file
            if ( isFile(file) ) { me.init( file ); }

            return me;
        };
        Song.prototype = {
            init: function InitwithAudioFileBuffer( file ) {
                var me = this;
                if (!isFile(file)) {
                    throw new Error('Song.init() receive something but file.');
                }
                else {
                    if (me.states.init) { console.error('Each Song can only init once.'); return me;}

                    me._file = file;
                    me.states.init = true;

                    me.fileName = file.name;
                    me.size = file.size;
                    me.type = file.type;

                    // add event emitter on Song
                    Emitter.attachTo( me );

                    // analyseFilename for SongList update information
                    me.analyseFilename(); // filling title,artist

                }
            },
            analyseFilename: function() {
                var me = this;

                // main works
                // get rid of subfix
                var name = me.fileName.substring(0, me.fileName.lastIndexOf('.') );
                // JH-bugs: what if fileName not obey standard 'ARTIST-TITLE'
                if (name.search('-') === -1) {
                    console.warn('Song: Not a Regular Filename.');
                    me.title = name.trim();
                    return me;
                }
                var result = name.split('-');
                me.artist = result[0].trim(); result.shift();
                me.title  = result.length === 1? result[0].trim(): result.join('-').trim();
                me.states.analyseFilename = true;

                return me;
            },
            //Notes: readFile is an asynchronous function
            readFile: function ReadFileUsingFileReader( callback ) { // asynchronous function
                var me = this;
                if (me.states.readFile) { typeof(callback) === 'function' && callback(); return me;}
                if (me.ASYNCHRONOUS) { throw new Error('Song is processing.'); }

                // main work
                me.ASYNCHRONOUS = true;

                Toast.log('reading file: ' + me.fileName, 10);
                var fr = new FileReader();
                fr.readAsArrayBuffer( me._file );
                fr.onload = function(e) {
                    me._buffer = fr.result;
                    me.states.readFile = true;

                    Toast.log(me.title + ' loaded.', 'fast');
                    console.log('Song: ' + me.title + ' loaded.');

                    me.ASYNCHRONOUS = false;
                    typeof(callback) === 'function' && callback();
                };
                fr.onerror = function(e) {
                    console.error(e);
                    me.ASYNCHRONOUS = false;
                    throw new Error('Song load buffer failed.');
                };
                return me;
            },
            //Notes: decode is an asynchronous function
            decode: function DecodeAudioData( callback ) { // asynchronous function
                var me = this;
                if (!me.states.readFile) { me.readFile(function(){ me.decode(callback); }); return me;}
                if (me.states.decode) { typeof(callback) === 'function' && callback(); return me;}
                if (me.ASYNCHRONOUS) { throw new Error('Song is processing.'); }


                // main work
                me.ASYNCHRONOUS = true;
                // decode using AudioContext
                Toast.log('decoding audio: ' + me.title, 10);
                ctx.decodeAudioData(me._buffer, function( audioBuffer ) {
                    me._audioBuffer = audioBuffer;
                    me.states.decode = true;
                    Toast.log(me.title + ' decoded.');

                    me.ASYNCHRONOUS = false;
                    typeof(callback) === 'function' && callback();
                });
                return me;
            },
            createBufferSource: function ( callback ) { // if you want to play one more time
                var me = this;
                if (!me.states.decode) { me.decode(function(){ me.createBufferSource(callback); }); return me;}

                // main works
                var bs = ctx.createBufferSource();
                bs.buffer = me._audioBuffer;
                bs.onended = function(e) {
                    me.STOPPED = true;
                    controller.songEnd( me ); // callback with song
                    console.log('SongEnd: ' + me.title);
                };

                if(me.bufferSourceNode) { me.bufferSourceNode.disconnect(); }
                me.bufferSourceNode = bs;

                me.currentTime = 0;
                me.timeOffset = 0;
                cancelAnimationFrame( me.__timer );
                me.__TIMEUPDATE = false;

                // if there is a gainNode, connect to it
                if (me.gainNode) { bs.connect(me.gainNode); }
                // otherwise, set bufferSourceNode to me.output
                else { me.output = bs; }

                me.states.createBufferSource = true;

                typeof(callback) === 'function' && callback( me.bufferSourceNode );
                return me;
            },
            getDuration: function GetSongDuration() {
                var me = this;
                if (!me.states.decode) { me.decode(function(){ me.getDuration(); }); return me;}

                me.duration = me._audioBuffer.duration;
                return me.duration;
            },
            createGain: function createGain() {
                var me = this;
                if (!me.states.createBufferSource) { me.createBufferSource(function(){ me.createGain(); }); return me;}

                // if can't get one, create one
                if (!me.gainNode) { me.gainNode = ctx.createGain(); }

                me.bufferSourceNode.connect(me.gainNode);
                    me.output = me.gainNode;

                return me;
            },
            connect: function ConnectSongToAudioContext( anotherAudioContextNode ) {
                var me = this;
                me.readFile(function() {
                    me.decode(function() {
                        me.createBufferSource();
                        me.getDuration();
                        me.createGain();

                        if (anotherAudioContextNode && anotherAudioContextNode.disconnect) {
                            me.output.connect( anotherAudioContextNode );
                        }
                        else {
                                // get a function
                            if ( typeof(anotherAudioContextNode) === 'function' ) { anotherAudioContextNode(); }
                            me.output.connect( headGain );
                        }
                    });
                });

                return me;
            },

            play: function() {
                var me = this;
                var lastone = NS.audio.currentPlayingSong;
                var tagTotalTime = $('#tag-totalTime'),
                    format = NS.util.formatTimestamp;

                // console.warn(me.title + me.artist);
                NS.dom.tagSongMessage.node.update( me.title, me.artist );
                // JH-bugs: me.artist is not defined
                NS.lyric.lookup( me.title );

                try {
                    // play one song only
                    if (lastone && lastone !== me) { lastone.stop(); }

                    // when audio had been PAUSED
                    if (me.PAUSED) { // if play after pause, just connect to headGain
                        me.output.connect(NS.audio.headGain);

                        tagTotalTime.innerHTML = format( me.duration );

                        me.timeupdate();
                        me.trigger('play',{title: me.title});

                        me.PAUSED = false;
                        me.STOPPED = false;
                        return me;
                    }

                    // when audio had been stop
                    if (me.STOPPED) { // create newe buffersource if me had been stop
                        me.createBufferSource(function() {
                            me.STOPPED = false;
                            me.PAUSED = false;
                            me.play();
                            me.getDuration();
                            tagTotalTime.innerHTML = format( me.duration );

                            me.currentTime = 0;
                            me.timeupdate();
                            me.trigger('play',{title: me.title});
                        });
                        return me;
                    }

                    NS.audio.currentPlayingSong = me;
                    if (me.states.decode) {
                        // play if bufferSourceNode was never been played
                        me.createBufferSource();
                        me.createGain();
                        me.output.connect(NS.audio.headGain);

                        me.bufferSourceNode.start(0);
                        me.getDuration();
                        tagTotalTime.innerHTML = format( me.duration );

                        me.currentTime = 0;
                        me.timeupdate();
                        me.trigger('play',{title: me.title});
                    }
                    else {
                        // use connect to handle all asynchronous functions
                        me.connect( function() {
                            if (NS.audio.currentPlayingSong !== me) { return false; }
                            me.bufferSourceNode.start(0);
                            me.getDuration();
                            tagTotalTime.innerHTML = format( me.duration );

                            me.currentTime = 0;
                            me.timeupdate();
                            me.trigger('play',{title: me.title});
                        });
                    }

                }
                catch(e) { // bufferSourceNode is already play
                    console.log(e);
                    me.output.disconnect();

                    me.createBufferSource(function(bufferSource) {
                        me.createGain();
                        me.play();
                    });
                }
                return me;
            },
            playAt: function( time ) {
                var me = this;

                if (me.__TIMEUPDATE) {
                    cancelAnimationFrame( me.__timer );
                    me.__TIMEUPDATE = false;
                }
                me.createBufferSource();
                me.bufferSourceNode.start(0, time);

                me.currentTime = time;
                // console.log('play at time ' + time);
                me.timeupdate();

                NS.lyric.refresh();
                return me;
            },
            stop: function() {
                var me = this;
                if (me.STOPPED) { return me; }
                if (me.states.createBufferSource) {

                    NS.dom.viewDisk.node.turnOff();

                    me.STOPPED = true;
                    me.currentTime = me.duration;
                    me.timeOffset = me.context.currentTime;
                    cancelAnimationFrame( me.__timer );
                    me.__TIMEUPDATE = false;

                    me.output.disconnect();
                    me.bufferSourceNode.stop(0);
                    me.trigger('stop',{title: me.title});
                }
                return me;
            },
            pause: function() {
                var me = this;
                if (me.PAUSED || me.STOPPED) { return me; }
                NS.dom.viewDisk.node.turnOff();

                me.output.disconnect(NS.audio.headGain);
                me.PAUSED = true;

                cancelAnimationFrame( me.__timer );
                me.__TIMEUPDATE = false;
                me.trigger('pause',{title: me.title});

                return me;
            },
            timeupdate: function() {
                var me = this;

                if ( me.__TIMEUPDATE ) { return me; } // already updating

                me.timeOffset = me.context.currentTime - me.currentTime;
                // console.log('currentTime: ' + me.currentTime);
                var audioContextTimeupdate = function() {
                    if ( (me.context.currentTime - me.timeOffset) > me.duration ) {
                        cancelAnimationFrame( me.__timer );
                        me.__TIMEUPDATE = false;

                        return me;
                    }

                    me.currentTime = me.context.currentTime - me.timeOffset;

                    // plan A: making a 'timeupdate' event on AudioContext
                    me.context.dispatchEvent(new Event('timeupdate'), {
                        'bubbles': true,
                        'defaultPrevented': false,
                        'isTrusted': true,
                        'target': me,
                        'originalTarget': me,
                        'srcElement': me,
                        'timeStamp': + new Date()
                    });

                    // plan B
                    // _.each(me.onTimeupdate, function(fn) {
                    //     fn( me.currentTime );
                    // });
                    me.__timer = requestAnimationFrame( audioContextTimeupdate );
                    me.__TIMEUPDATE = true;
                };
                audioContextTimeupdate();
            },
            toString: function() { return '[object Song]'},
        };
        var isSong = function( song ) {
            return song && song.constructor && song.constructor === Song;
        };

        // extendable songlist
        var SongList = function() {
            var songlist = [];
            // add events emitter on songlist
            Emitter.attachTo(songlist);

            songlist.pre = 0;
            songlist.next = 1; // index for next one
            songlist.playing = 0; // index for current playing or PAUSED songlist

            // bind songlist to #btn-playMode to change songlist.mode when button is clicked
            songlist.init = function init( target ) {
                target = $.isDOMElement(target)? target : $('#btn-playMode');
                var me = songlist;

                $on(target, 'playmodechange', function() {
                    me.mode = target.node.mode;
                });

                return songlist;
            }

            songlist.MODES = ['LOOP', 'REPEATONE', 'SHUFFLE'];
            // private data set for songlist.mode
            var _mode = 'LOOP';
            // mode for playlist 'LOOP' 'REPEATONE' 'SHUFFLE'
            Object.defineProperty(songlist, 'mode', {
                get: function(){return _mode;},
                set: function(mode){
                    var InModes = false;
                    if (mode === 'SHUFFLE') {
                        _songlist.init();
                    }
                    songlist.MODES.forEach(function(value){
                        if (mode === value) {
                            InModes = true;
                            _mode = value;
                        }
                    });
                    if (!InModes) console.warn('Wrong value applied.');
                    return songlist;
                }
            });

            // overwrite native Array.push to fulfill testing
            songlist.push = function() {
                var me = songlist;
                _.each(arguments, function(song) {
                    if ( isSong(song) && song.states.init ) {
                        Array.prototype.push.call(me, song);
                        song.analyseFilename();

                        // callback functions when update
                        if (typeof(me.output) === 'function') {
                            me.output( me.message() );
                        }

                        me.trigger('push',{title: song.title});
                        song.on('play pause stop', function(e) {
                            me.trigger(e.type, e);
                        });
                        return me;
                    }
                    console.warn('You\'re trying to push a object not Song instance or uninit Song to SongList');
                    return me;
                });
            };

            // this function will be complemented when this songlist is binded
            songlist.output = function() {};

            // generate song messages in this list
            songlist.message = function( itemCount ) {
                var songMessage = [];
                songlist.forEach(function(song) {
                    songMessage.push( {
                        title: song.title,
                        artist: song.artist
                    }); // every Song will invoke Song.analyseFilename() before push into SongList
                });
                return songMessage;//.splice(0, itemCount > 0? itemCount: undefined);
            }; // songlist.message ends

            // private function to generate next song index by songlist.mode
            var _songlist = {
                index: 0,
                value: 0,
                list: [],

                init: function() {
                    // don't not cover already played one
                    var generateNumberArray = function( length ){
                        var arr = [];
                        for (var i = 0; i < length; i++ ){
                            arr.push(i);
                        }
                        return arr;
                    };
                    var shuffleCurrentList = function( list ) {
                        return list.sort(
                            function(){ return Math.round( Math.random() * 2 -1 ); } );
                        };

                    this.list = generateNumberArray( songlist.length );
                    this.list = shuffleCurrentList( this.list );

                    return this;
                },
                findIndex: function(v){
                    var me = this.list;
                    if (v > me.length) { return -1; }

                    for (var i = 0; i < me.length; i++) {
                        if (me[i] === v) {
                            return i;
                        }
                    }
                },
                pre: function(){
                    var i = this.index - 1, max = this.list.length - 1;
                    var index = i < 0? max: i;

                    return this.list[ index ]; // return the 'value' of songlist
                },
                next: function(){
                    var i = this.index + 1, max = this.list.length - 1;
                    var index = i > max? 0: i;

                    return this.list[ index ];
                },
                turnNext: function( last ){
                    this.value = last;
                    this.index = this.findIndex( last );

                    songlist.next = this.next();
                    songlist.pre = this.pre();
                },
            }; // only store index of songs

            songlist.on('push', function(){
                _songlist.init();
            });

            var _nextsong = function( last ) { // generate next song index
                var me = songlist,
                    mode = me.mode;
                me.playing = last;

                switch (mode) {
                    case 'SHUFFLE':
                        _songlist.turnNext( last );
                        break;
                    case 'REPEATONE':
                        me.next = last;
                        me.pre = (last - 1) < 0? (me.length - 1): (last - 1);
                        break;
                    case 'LOOP':
                    default:
                        me.next = (last + 1) >= me.length? 0: (last + 1);
                        me.pre = (last - 1) < 0? (me.length - 1): (last - 1);
                        break;
                }
            };

            songlist.play = function( index ) {
                var me = songlist;
                var index = +index;
                index = ( _.isNumber(index) && index < me.length)? index: 0;

                me[index].play(0);
                _nextsong( index );

                Toast.log('next song: ' + me[index].title );

                $('#menu-songlist').node.current( index );
            };
            songlist.playNext = function() {
                var me = songlist;
                var index = songlist.next;
                songlist.play( index );

                me.trigger( 'playnext',
                        {index: index, title: me[index].title});
            };
            songlist.playPre = function() {
                var me = songlist;
                var index = songlist.pre;
                songlist.play( index );

                me.trigger( 'playprevious',
                        {index: index, title: me[index].title});
            };

            return songlist;
        }; // end of SongList

        return {
            Song: Song, // Song creator function
            SongList: SongList, // SongList creator function

            ctx: ctx,
            headGain: headGain,
            songlist: new SongList(),
            currentPlayingSong: currentPlayingSong,
            controller: controller,
        }
    };

    // Lyric File
    var Lyric = function Lyric( file ) {
        var me = this;
        if (me === window) { return new Lyric( file ); }

        me.constructor = Lyric;

        me._file = me._buffer = null;
        me.fileName = me.size = me.type = null; // messages from File
        me.title = me.artist = null;

        me.states = {
            init: false,
            analyseFilename: false,
            readFile: false,
            decode: false
        };
        me.ASYNCHRONOUS = false;

        // if get argument file
        if ( isFile(file) ) { me.init( file ); }

        return me;
    };
    Lyric.prototype = {
        init: function( file ) {
            var me = this;

            if (!isFile(file)) { throw new Error('Lyric.init() receive something but file.'); }
            else {
                if (me.states.init) { console.error('Each Song can only init once.'); return me;}

                me._file = file;
                me.states.init = true;

                me.fileName = file.name;
                me.size = file.size;
                me.type = file.type;


                // analyseFilename for SongList update information
                me.analyseFilename();
            }
        },
        analyseFilename: function() {
            var me = this;

            // main works
            // get rid of subfix
            var name = me.fileName.substring(0, me.fileName.lastIndexOf('.') );
            // JH-bugs: what if fileName not obey standard 'ARTIST-TITLE'
            if (name.search('-') === -1) {
                console.warn('Lyric: Not a Regular Filename.');
                me.title = name.trim();
                return me;
            }
            var result = name.split('-');
            me.artist = result[0].trim(); result.shift();
            me.title  = result.length === 1? result[0].trim(): result.join('-').trim();
            me.states.analyseFilename = true;

            return me;
        },
        //Notes: readFile is an asynchronous function
        readFile: function GetFileUsingFileReader( callback, DOMEncoding ) { // asynchronous function
            var me = this;
            if (me.states.readFile) { typeof(callback) === 'function' && callback(); return me;}
            if (me.ASYNCHRONOUS) { throw new Error('Lyric is processing.'); }

            // main work
            me.ASYNCHRONOUS = true;

            var fr = new FileReader();
            fr.readAsText(me._file, DOMEncoding || 'GB2312');

            fr.onload = function(e) {
                me._buffer = fr.result;
                me.states.readFile = true;
                console.log('Lyric: ' + me.title + ' loaded.');

                me.ASYNCHRONOUS = false;
                typeof(callback) === 'function' && callback();
            };
            fr.onerror = function(e) {
                console.error(e);
                me.ASYNCHRONOUS = false;
                throw new Error('Lyric load buffer failed.');
            };

            return me;
        },
        // notice: file encoding:
        // utf-8
        // ANSI
        // UCS2 BigEndian
        //      LittleEndian
        decode: function( callback ) {
            // parse lrc into Array Object
            // Example
            //[ti:Rolling In The Deep]
            //[ar:
            //Adele]
            //[al:21]
            // ==> ['ti:Rolling In The Deep',
            //      'ar:Adele',
            //      'al:21']
            var splitLyricString = function splitLyricString( lyricString ) { // split by '[' or ']'
                var rg = /[\[\]]/g;
                var arr = lyricString.split(rg);

                // combine multi-line content into one line
                // by replacing '\n'
                _.map(arr, function( str ) {
                    return str.replace("\n", '');
                });

                return arr;
            };
            var classifyLyric = function classifyLyric(arr) {
            	// two modes
            	// 1. one TimeStamp one lyrics        normal
            	// 2. several timeTags one lyrics   compressd

            	// metamsg RegExp
            	// ti : title
            	// ar : artist
            	// al : album
            	// by : lyric maker
            	var rgMetaMsg = /(ti|ar|al|by|offset):(.+)/,
                    isMeta = function(str) { return rgMetaMsg.test(str); }
            	// timetag regexp
            	// 1. mm:ss.ms
            	var rgTimetag = /^(\d{2,}):(\d{2})[.:]{1}(\d{2})$/,
                    isTimetag = function(str) { return rgTimetag.test(str); }

            	// function(timetag): to transform
            	// "01:01.01" ==> 60 + 1 + .01
            	var parseTimetag = function(timetag) {
            		var aTMP = rgTimetag.exec(timetag);
            		var floatTime = parseInt(aTMP[1]) * 60 + parseInt(aTMP[2]) + parseInt(aTMP[3]) / 100;
            		return floatTime;
            	};


            	// returnArrayObject
            	// prototype oResult[12.34] = []
            	var oResult = {},
                    lyrics = [],
                    timeTags = [];

            	// go through the array
                for (var i=0; i < arr.length; i++) {
                    if ( isMeta( arr[i] ) ) {         // handling meta messages
                        var aTMP = rgMetaMsg.exec(arr[i]);
                        oResult[aTMP[1]] = aTMP[2];
                    }
                    else if( isTimetag( arr[i] ) ) { // handling timestamp and lyrics

                        // in compress mode:
                        // to collect series of timestamp
                        var timetagsofOneLyric = [];

                        // collect all timeTags
                        while ( isTimetag(arr[i]) ) {
                            var floatTime = parseTimetag(arr[i]);
                            timetagsofOneLyric.push( floatTime );
                            timeTags.push( floatTime );
                            i++;
                        }

                        // collect this line of lyric
                        var lyriccontent = arr[i].search(/[^\s]/g) !== -1? arr[i] : '...'; // to place a '_' in empty lines
                        lyrics.push( lyriccontent );
                        var indexOftheLyric = lyrics.length - 1;

                        // restore timetagsofOneLyric to oResult
                        // oResult[ sNow ] = [ ref to index of lrc ]
                        _.each(timetagsofOneLyric, function( tag ) {
                            if (oResult[ tag ]) {
                                oResult[ tag ].push( indexOftheLyric );
                            } else {
                                oResult[ tag ] = [ indexOftheLyric ];
                            }
                        });
                    }
                }


                // sort
            	var sortByNumber = function(a, b) { return a>b? 1: -1; };
            	timeTags.sort(sortByNumber);

                oResult.timeTags = timeTags;
                oResult.lyrics = lyrics;
            	return oResult;
            };

            var me = this;
            if (!me.states.readFile) { me.readFile(function(){ me.decode(callback); }); return me; }

            me[0] = classifyLyric( splitLyricString(me._buffer) );

            me.states.decode = true;

            typeof(callback) === 'function' && callback();
            return me;
        },
        generate: function() {
            var me = this;
            if (!me.states.readFile) { me.readFile(function(){ me.decode(); me.generate(); return me; }); }

            var wrapper = me[0],
                lyrics = wrapper.lyrics,
                tags = wrapper.timeTags,
                ul = $dom('ul');

            _.each(tags, function( tag ) {
                var index = wrapper[tag];
                var li = $dom('li');
                li.className = 'line';
                li.dataset.line = index;
                li.innerHTML = lyrics[index];
                ul.appendChild(li);
            });
            return ul.innerHTML;
        },
    }
    var isLyric = function( lyric ) {
        return lyric && lyric.constructor && lyric.constructor === Lyric;
    };

    // Image File : album covers
    var AlbumCover = function( file ) {
        var me = this;
        if (me === window) { return new AlbumCover( file ); }

        me.constructor = AlbumCover;

        me._file = me._buffer = null;
        me.fileName = me.size = me.type = null; // messages from File
        me.title = me.artist = null;

        me.states = {
            init: false,
            analyseFilename: false,
            readFile: false
        };
        me.ASYNCHRONOUS = false;

        // if get argument file
        if ( isFile(file) ) { me.init( file ); }

        return me;
    };
    AlbumCover.prototype = {
        init: function( file ) {
            var me = this;

            if (!isFile(file)) { throw new Error('AlbumCover.init() receive something but file.'); }
            else {
                if (me.states.init) { console.error('Each Song can only init once.'); return me;}

                me._file = file;
                me.states.init = true;

                me.fileName = file.name;
                me.size = file.size;
                me.type = file.type;


                // analyseFilename for SongList update information
                me.analyseFilename();
            }
        },
        analyseFilename: function() {
            var me = this;

            // main works
            // get rid of subfix
            var name = this.fileName.substring(0, me.fileName.lastIndexOf('.') );
            // JH-bugs: what if fileName not obey standard 'ARTIST-TITLE'
            if (name.search('-') === -1) {
                console.warn('AlbumCover: Not a Regular Filename.');
                me.title = name.trim();
                return me;
            }

            var result = name.split('-');
            me.artist = result[0].trim(); result.shift();
            me.title = result.length === 1? result[0].trim(): result.join('-').trim();

            me.states.analyseFilename = true;

            return me;
        },
        //Notes: readFile is an asynchronous function
        readFile: function GetFileUsingFileReader( callback ) { // asynchronous function
            var me = this;
            if (me.states.readFile) { typeof(callback) === 'function' && callback(); return me;}
            if (me.ASYNCHRONOUS) { throw new Error('AlbumCover is processing.'); }

            me.ASYNCHRONOUS = true;

            var fr = new FileReader();
            fr.readAsDataURL(me._file);

            fr.onload = function(e) {
                me._buffer = fr.result;
                me.states.readFile = true;
                console.log('AlbumCover: ' + me.title + ' loaded.');

                me.ASYNCHRONOUS = false;
                typeof(callback) === 'function' && callback();
            };
            fr.onerror = function(e) {
                console.error(e);
                me.ASYNCHRONOUS = false;
                throw new Error('AlbumCover load buffer failed.');
            };
            return me;
        },
        setBackgroundTo: function setBackgroundTo( target ) {
            if(!$.isDOMElement(target) && !$.isDOMElement(target[0])) { return false; }
            var me = this;
            if (!me.states.readFile) { me.readFile(function(){ me.setBackgroundTo( target ); }); return me; }

            // var createStyle = NS.util.createStyle;
            // createStyle.createTag('.icon-userIcon: { background-image: url("' + me._buffer + '") !important;')
            //            .insert();
            Toast.log('new album cover already set.');

            if (_.isArray(target)) {
                _.each(target, function(item){ item.style.backgroundImage = 'url(' + me._buffer + ")"; });
            } else {
                target.style.backgroundImage = 'url(' + me._buffer + ")";
            }
            return me;
        },
    }
    var isCover = function( cover ) { return cover && cover.constructor && cover.constructor === AlbumCover; };

    // Binding to NS
    // adding to w.NS;
    var ns = w.NS;
    ns.localfilelist = new LocalFileList();
    ns.stackShowup = []; // divide into 2 or 3 level
    ns.stackShowup.releaseAll = function() {
        while (ns.stackShowup.length) {
            ns.stackShowup.pop()();
        }
    };

    ns.supports = {
        audioContext: supportAudioContext(),
        mobile: isMobile(),
        fullscreen: supportFullscreen
    };

    ns.audio = audioCtx();
    ns.lyric = {
        defaults: {
            currentView: $('#view-lyric'),
        },
        Lyric: Lyric,
        list: {},
        push: function( lyric ) {
            var me = ns.lyric,
                list = me.list;

            if ( !isLyric(lyric) ) { return false; }

            var fileOneTitle = list[ lyric.title ];
            if (_.isArray( fileOneTitle )) {

                for (var i = 0; i < fileOneTitle.length; i++) {

                    if (isOneFile(l, lyric)) { return true; }
                }

                // no same file
                fileOneTitle.push(lyric);
            }
            if (fileOneTitle) {
                // same file
                if ( isOneFile(fileOneTitle, lyric)) { return true; }
                // same title but different files
                list[ lyric.title ] = [ fileOneTitle, lyric ];
            }

            list[ lyric.title ] = lyric;
        },
        currentLyric: null,
        currentView: null,
        bindLyric: function( lyric, callback ) {
            var me = ns.lyric;

            me.currentLyric = lyric;
            if (!lyric.states.decode) {
                lyric.decode(function() {
                    callback&&callback();
                });
            } else {
                callback&&callback();
            }
        },
        bindView: function( view, lyric ){
            if (!$.isDOMElement(view) ) { return false; }
            var me = ns.lyric;

            var ul = $(view, 'ul');
            if (!ul) { ul = $dom('ul'); view.appendChild(ul); }

            me.currentView = view;

            // JH-bugs: what if lyric is not lyric.states.decode ?
            if ( isLyric(me.currentLyric) ) {
                var linesLyric = me.currentLyric.generate();
                ul.innerHTML = linesLyric;
            }
            else if ( isLyric( lyric ) ) {
                var linesLyric = lyric.generate();
                ul.innerHTML = linesLyric;
            }
        },
        __lastListener: null,
        start: function( lyric ) {
            var me = ns.lyric;

            // ensure lyric is decoded.
            if (!lyric.states.decode) {
                lyric.decode(function() {
                    me.lookup( lyric.title ); // in case user change another song
                });
                return me;
            }

            $off(NS.audio.ctx, 'timeupdate', me.__lastListener);

            // setup for scroll lyrics
            var offsetTop = "";
            var lyricHightlightOriginTop = 160;
            var OFFSET = 0.5; // for lyric to show earlier

            me.bindLyric(lyric, function() { me.bindView( me.defaults.currentView ); });

            var lrc = lyric[0];
            var timetags = lrc.timeTags;
            var lyricsList = lrc.lyrics;

            var ul = $(me.currentView, 'ul');

            me.__lastListener = function() {
                var song = NS.audio.currentPlayingSong;

                var curTime = song.currentTime + OFFSET;

                    // auto scroll lyrics
            	for (var i=0; i<timetags.length; i++) {
                    // find the index of next line of lyrics: i
            		if (curTime <= timetags[i]) {
            			var arrlyricsList = lrc[ timetags[i-1] ] || []; // get lyric array by lrc[time]

            			var LIs = ul.childNodes;

                        // scroll the lyrics as audio play
            			if (i - 2 >= 0) {
            				LIs[i - 1].className = "line focus";
            				LIs[i - 2].className = "line";
            				ul.style.top = lyricHightlightOriginTop -(LIs[i - 1].offsetTop) + "px";
            			}
                        else if (i >= 1) {
            				LIs[i - 1].className = "line focus";
            				ul.style.top = lyricHightlightOriginTop -(LIs[i - 1].offsetTop) + "px";
            			}


            			var strLrcTMP = "";
            			// JH-bugs: multi-line what?
            			for (var j=0; j < arrlyricsList.length; j++) {
            				strLrcTMP += lyricsList[ arrlyricsList[j] ];
            			}

            			return strLrcTMP;
            		}
            	}
            };

            $on(NS.audio.ctx, 'timeupdate', me.__lastListener);
        },
        end: function() {
            var me = ns.lyric;
            $off(NS.audio.ctx, 'timeupdate', me.__lastListener);
            if (!me.currentView) { me.bindView(me.defaults.currentView); }

            var ul = $(me.currentView, 'ul');
            ul.innerHTML =
            '<span style="position:absolute;top:50%;width:100%;left:0;text-align:center;"><span class="btn" style="color:rgba(255,255,255,0.6);" onclick="$(\'input[type=file]\').click();">Click option button to add a lyric file.</span></span>';
        },
        lookup: function( title ) {
            var me = ns.lyric;
            if (me.list[ title ]) { // match
                me.start( me.list[ title ] );
                Toast.log('lyric found.', 'fast');
            }
            else { // no match
                me.end();
                Toast.log('no match lyric.', 'fast');
            }
        },
        refresh: function() {
            var me = ns.lyric;
            if (!me.currentView) {
                return false;
            }
            else {
                var lines = $(me.currentView, '.focus');
                _.each(lines, function( l ){
                    l.classList.remove('focus');
                });
            }
        },
    };
    ns.album = {
        defaults: {
            toCover: [ $('#page-main') ].concat( $.toArray( $('.view-albumCover') ) ),
        },
        AlbumCover: AlbumCover,
        list: {},
        push: function( cover ) {
            var me = ns.album,
                list = me.list;

            if ( !isCover(cover) ) { return false; }

            var fileOneTitle = list[ cover.title ];
            if (_.isArray( fileOneTitle )) {

                for (var i = 0; i < fileOneTitle.length; i++) {

                    if (isOneFile(l, cover)) { return true; }
                }

                // no same file
                fileOneTitle.push(cover);
            }
            if (fileOneTitle) {
                // same file
                if ( isOneFile(fileOneTitle, cover)) { return true; }
                // same title but different files
                list[ cover.title ] = [ fileOneTitle, cover ];
            }

            list[ cover.title ] = cover;
        },
        lookup: function( title ) {
            var me = ns.album;
            if (me.list[ title ]) {
                me.start( me.list[ title ] );
            }
        },
        start: function( cover ){
            var me = ns.album;
            var elem = me.defaults.toCover;
            if (_.isArray( elem )) {
                cover.readFile(function(){
                    _.each(elem, function(item) {
                        cover.setBackgroundTo( item );
                    });
                });
            } else {
                cover.readFile(function(){ cover.setBackgroundTo( elem ); });
            }
        },
    };

    var Router = (function() {
        var Router = function() {
            var me = this;
            me.state = null;
            me.push = function( page ) {
                if (page === '' + page) {
                    history.pushState(page, null);
                    me.state = page;
                }
            };
            return me;
        };
        return new Router();
    }());
    var createStyle = (function(){
        var CreateStyleTag = function() {
            var me = this;

            me.tags = [];
            me.createTag = function( content ) {
                me.tags.push(content);
                return me;
            };
            me.insert = function() {
                var tag = document.createElement('style');
                tag.innerHTML = me.tags.join('');
                document.body.appendChild(tag);
                return me;
            };

            return me;
        };

        return new CreateStyleTag();
    }());

    ns.util = {
        formatTimestamp:formatTimestamp,
        preloadImage:   preloadImage,
        isFile:         isFile,
        isOneFile:      isOneFile,
        isLyric:        isLyric,
        createStyle:    createStyle,
        Emitter:        Emitter,
        router:         Router,
    };
})(window);

// initial global parameters
(function(w) {
    // for mobile browser debug
    var elem = $('div#dConsole');
	w.dConsole = new DebugConsole(elem);

    // for state message Toast
    var toastbox = $('div#toastmessage');
    w.Toast = new ToastObject( toastbox );
})(window);
