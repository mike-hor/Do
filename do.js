/* Do version 2.0 pre
 * creator: kejun (listenpro@gmail.com)
 * 最新更新：2011-7-12
 */
/*
 * by:mike.hor
 * 最新更新 2017-07-20
 * 更新支持本地localStorage缓存css和js
 */
(function(win, doc) {

    // 已加载模块
    var loaded = {},

        // 已加载列表
        loadList = {},

        // 加载中的模块
        loadingFiles = {},

        // 内部配置文件
        config = {
            // 是否自动加载核心库
            autoLoad: false,
            localstorage: window.localStorage ? true : false,
            // 加载延迟
            timeout: 6000,
            deepversion: '1.0.0',
            // 核心库
            coreLib: [publicPath + "js/jquery.js"],

            /* 模块依赖
             * {
             *  moduleName: {
             *      path: 'URL',
             *      type:'js|css',
             *      requires:['moduleName1', 'fileURL']
             *  }
             * }
             */
            mods: {}
        },

        jsSelf = (function() {
            var files = doc.getElementsByTagName('script');
            return files[files.length - 1];
        })(),

        // 全局模块
        globalList = [],

        // 外部参数
        extConfig,

        // domready回调堆栈
        readyList = [],

        // DOM Ready
        isReady = false,

        // 模块间的公共数据 
        publicData = {},

        // 公共数据回调堆栈 
        publicDataStack = {},

        isArray = function(e) {
            return e.constructor === Array;
        },

        getMod = function(e) {
            var mods = config.mods,
                mod;
            if (typeof e === 'string') {
                mod = (mods[e]) ? mods[e] : {
                    path: e
                };
            } else {
                mod = e;
            }
            return mod;
        },

        load = function(url, type, charset, cb) {
            var wait, n, t, img, version, name

            done = function() {
                loaded[url] = 1;
                cb && cb(url);
                cb = null;
                win.clearTimeout(wait);
            };

            if (!url) {
                return;
            }

            if (loaded[url]) {
                loadingFiles[url] = false;
                if (cb) {
                    cb(url);
                }
                return;
            }

            if (loadingFiles[url]) {
                setTimeout(function() {
                    load(url, type, charset, cb);
                }, 10);
                return;
            }

            loadingFiles[url] = true;

            wait = win.setTimeout(function() {
                /* 目前延时回调处理，超时后如果有延时回调，执行回调，然后继续等
                 * 延时回调的意义是log延时长的URI，这个处理不属于加载器本身的功能移到外部
                 * 没有跳过是为了避免错误。
                 */
                if (config.timeoutCallback) {
                    try {
                        config.timeoutCallback(url);
                    } catch (ex) {}
                }
            }, config.timeout);
            //如果没写type就正则 检测类型
            t = type || url.toLowerCase().split(/\./).pop().replace(/[\?#].*/, '');
            if (config.localstorage) {
                var content = window.localStorage.getItem(url);
                if (content) {
                    addTxt(content, t)
                    done();
                    return
                } else {
                    getResource(url, function() {
                        done();
                        throw new Error(url + 'have no loading')
                    }, function(res) {
                        addTxt(res, t)
                        window.localStorage.setItem(url, res);
                        done();
                    })
                }
            } else {
                getResource(url, function() {
                    done();
                    throw new Error(url + 'have no loading')
                }, function(res) {
                    addTxt(res, t)
                    done();
                })
            }
        },
        getResource = function(url, error, success) {
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.onload = function() {
                if (request.status >= 200 && request.status < 400) {
                    var resp = request.responseText;
                    success(resp)
                }
            };
            request.onerror = function() {
                error()
            };
            request.send();
        },
        //动态添加js，css文件内容   
        addTxt = function(text, fileType) {
            var head = document.getElementsByTagName('HEAD').item(0);
            var link;
            if (fileType == "js") {
                link = document.createElement("script");
                link.type = "text/javascript";
                link.innerHTML = text;
            } else {
                link = document.createElement("style");
                link.type = "text/css";
                link.innerHTML = text;
            }
            head.appendChild(link);
        },
        // 加载依赖论文件(顺序) //deps = ["base"]   or deps = ["progress", "dialog"]
        loadDeps = function(deps, cb) {
            var mods = config.mods,
                id, m, mod, i = 0,
                len;

            id = deps.join('');
            len = deps.length;
            if (loadList[id]) {
                cb();
                return;
            }

            function callback() {
                if (!--len) {
                    loadList[id] = 1;
                    cb();
                }
            }

            for (; m = deps[i++];) {
                //console.log(m); progress 
                mod = getMod(m);
                //console.log(mod) {path: "public/core/module/progress/progress.min.js"}
                if (mod.requires) {
                    loadDeps(mod.requires, (function(mod) {
                        return function() {
                            load(mod.path, mod.type, mod.charset, callback);
                        };
                    })(mod));
                } else {
                    load(mod.path, mod.type, mod.charset, callback);
                }
            }
        },

        /*!
         * contentloaded.js
         *
         * Author: Diego Perini (diego.perini at gmail.com)
         * Summary: cross-browser wrapper for DOMContentLoaded
         * Updated: 20101020
         * License: MIT
         * Version: 1.2
         *
         * URL:
         * http://javascript.nwbox.com/ContentLoaded/
         * http://javascript.nwbox.com/ContentLoaded/MIT-LICENSE
         *
         */

        // @win window reference
        // @fn function reference
        contentLoaded = function(fn) {
            var done = false,
                top = true,
                doc = win.document,
                root = doc.documentElement,
                add = doc.addEventListener ? 'addEventListener' : 'attachEvent',
                rem = doc.addEventListener ? 'removeEventListener' : 'detachEvent',
                pre = doc.addEventListener ? '' : 'on',

                init = function(e) {
                    if (e.type == 'readystatechange' && doc.readyState != 'complete') return;
                    (e.type == 'load' ? win : doc)[rem](pre + e.type, init, false);
                    if (!done && (done = true)) fn.call(win, e.type || e);
                },

                poll = function() {
                    try {
                        root.doScroll('left');
                    } catch (e) {
                        setTimeout(poll, 50);
                        return;
                    }
                    init('poll');
                };

            if (doc.readyState == 'complete') fn.call(win, 'lazy');
            else {
                if (doc.createEventObject && root.doScroll) {
                    try {
                        top = !win.frameElement;
                    } catch (e) {}
                    if (top) {
                        poll();
                    }
                }
                doc[add](pre + 'DOMContentLoaded', init, false);
                doc[add](pre + 'readystatechange', init, false);
                win[add](pre + 'load', init, false);
            }
        },

        fireReadyList = function() {
            var i = 0,
                list;
            if (readyList.length) {
                for (; list = readyList[i++];) {
                    d.apply(this, list);
                }
            }
        },

        d = function() {
            //判断当前版本号与缓存版本号
            var deepversion = win.localStorage.getItem('deepversion');
            if (config.localstorage && deepversion) {
                if (config.deepversion.split('.').join('') > deepversion.split('.').join('')) {
                    win.localStorage.clear();
                    win.localStorage.setItem('deepversion', config.deepversion);
                }
            } else {
                win.localStorage.setItem('deepversion', config.deepversion);
            }
            var args = [].slice.call(arguments),
                fn, id;
            // 加载核心库
            if (config.autoLoad &&
                !loadList[config.coreLib.join('')]) {
                loadDeps(config.coreLib, function() {
                    d.apply(null, args);
                });
                return;
            }

            // 加载全局库
            if (globalList.length > 0 &&
                !loadList[globalList.join('')]) {
                loadDeps(globalList, function() {
                    d.apply(null, args);
                });
                return;
            }

            if (typeof args[args.length - 1] === 'function') {
                fn = args.pop();
            }

            id = args.join('');

            if ((args.length === 0 || loadList[id]) && fn) {
                fn();
                return;
            }
            //console.log('当前加载mod列表:' + args);
            loadDeps(args, function() {
                loadList[id] = 1;
                fn && fn();
            });
        };
    d.add = function(sName, oConfig) {
        if (!sName || !oConfig || !oConfig.path) {
            return;
        }
        config.mods[sName] = oConfig;
    };

    d.delay = function() {
        var args = [].slice.call(arguments),
            delay = args.shift();
        win.setTimeout(function() {
            d.apply(this, args);
        }, delay);
    };

    d.global = function() {
        var args = isArray(arguments[0]) ? arguments[0] : [].slice.call(arguments);
        globalList = globalList.concat(args);
    };

    d.ready = function() {
        var args = [].slice.call(arguments);
        if (isReady) {
            return d.apply(this, args);
        }
        readyList.push(args);
    };

    d.css = function(s) {
        var css = doc.getElementById('do-inline-css');
        if (!css) {
            css = doc.createElement('style');
            css.type = 'text/css';
            css.id = 'do-inline-css';
            jsSelf.parentNode.insertBefore(css, jsSelf);
        }

        if (css.styleSheet) {
            css.styleSheet.cssText = css.styleSheet.cssText + s;
        } else {
            css.appendChild(doc.createTextNode(s));
        }
    };

    d.setData = d.setPublicData = function(prop, value) {
        var cbStack = publicDataStack[prop];

        publicData[prop] = value;

        if (!cbStack) {
            return;
        }

        while (cbStack.length > 0) {
            (cbStack.pop()).call(this, value);
        }
    };

    d.getData = d.getPublicData = function(prop, cb) {
        if (publicData[prop]) {
            cb(publicData[prop]);
            return;
        }

        if (!publicDataStack[prop]) {
            publicDataStack[prop] = [];
        }

        publicDataStack[prop].push(function(value) {
            cb(value);
        });
    };

    d.setConfig = function(n, v) {
        config[n] = v;
        return d;
    };
    d.setFilestate = function() {

    };
    d.getConfig = function(n) {
        return config[n];
    };

    win.Do = d;

    contentLoaded(function() {
        isReady = true;
        fireReadyList();
    });

    // 初始外部配置
    extConfig = jsSelf.getAttribute('data-cfg-autoload');
    if (extConfig) {
        config.autoLoad = (extConfig.toLowerCase() === 'true') ? true : false;
    }

    extConfig = jsSelf.getAttribute('data-cfg-corelib');
    if (extConfig) {
        config.coreLib = extConfig.split(',');
    }

})(window, document);