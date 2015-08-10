(function (win, $) {
    var Bean = function () { },
        delegateEventSplitter = /^(\S+)\s*(.*)$/,
        _id = 0,
        url = location.href,
        $win=$(win),
        agent=navigator.userAgent.toLowerCase(),
        isdebug=true,
        isapp=agent.indexOf('jdapp')>-1,
        isChat=agent.indexOf('micromessenger')>-1,
        slice = Array.prototype.slice,
        reges = /\{(\d+?)\}/g,
        ajaxSettings=$.ajaxSettings,
        templateCaches={},
        $toast = $('#toast'),
        sets = {},
        escapes = {
            "'": "'",
            '\\': '\\',
            '\r': 'r',
            '\n': 'n',
            '\t': 't',
            '\u2028': 'u2028',
            '\u2029': 'u2029'
        },
        templateSettings = {
           evaluate: /<%([\s\S]+?)%>/g,
           interpolate: /<%=([\s\S]+?)%>/g,
           escape: /<%-([\s\S]+?)%>/g
        };
    ajaxSettings.beforeSend=function(){
       spinner.start(); 
    };
    ajaxSettings.complete=function(){
        spinner.stop();
    };
    function uniqueId(prefix) {
        var id = ++_id + '';
        return prefix ? prefix + id : id;
    }
    Bean.View=(function(){
        function baseView(obj) {
            this.cid = uniqueId('view');
            this.$el = $(stringFormat('<div id="{0}"></div>',this.cid));
            this.renderData =this.data;
            this.undelegateEvents();
            if($.isFunction(this.beforeRender)){
                this.renderData=this.beforeRender(this.renderData)||{};
            }
            this.render(template(this.template,this.renderData));
            if($.isFunction(this.afterRender)){
                this.afterRender(this.renderData);
            }
            this.delegateEvents();
            return this;
        }
        baseView.prototype = {
            render: function (html) {
                this.$el.remove().append(html);
                //return this;
            },
            delegateEvents: function (events, keepOld) {
                if (!(events || (events = this.events))) {
                    return this;
                }
                if (!keepOld) {
                    this.undelegateEvents();
                }
                for (var key in events) {
                    var method = events[key];
                    if (typeof method !== 'function') {
                        method = this[events[key]];
                    }

                    var match = key.match(delegateEventSplitter);
                    var eventName = match[1],
                            selector = match[2];

                    eventName += '.delegateEvents' + this.cid;
                    method = bind(method, this);
                    this.$el.on(eventName, (selector ? selector : null), method);
                }
                return this;
            },
            undelegateEvents: function () {
                this.$el.off('.delegateEvents' + this.cid);
                return this;
            },
            close:function(){
                this.$el.off();
                //this.off();
            }

        };
        return function(proto){
            var view=inherit(baseView);
            $.extend(view.prototype,proto);
            return view;
        };
    })();
    function inherit(child, parent) {
        if (typeof parent != 'function') {
            parent = child;
            child = function () {
                if (child.prototype.constructor != child) {
                    child.prototype.constructor.apply(this, arguments);
                } else {
                    parent.apply(this, arguments);
                }
            };
        }

        function Ctor() {
            this.constructor = child;
        }

        Ctor.prototype = parent.prototype;
        child.prototype = new Ctor();
        child.__super__ = parent.prototype;
        child.superClass = parent;
        return child;
    };
    function bind(fn, me) {
        return function () {
            return fn.apply(me, arguments);
        };
    };
    /*
    function inheritView(proto) {
        var view = inherit(baseView);
        $.extend(view.prototype, proto);
        return view;
    };
   */
    function template(text, data, settings) {
        var render;
        settings = $.extend({}, templateSettings, settings);
        var noMatch = /(.)^/;
        var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
        var matcher = new RegExp([
          (settings.escape || noMatch).source,
          (settings.interpolate || noMatch).source,
          (settings.evaluate || noMatch).source
        ].join('|') + '|$', 'g');

        var index = 0;
        var source = "__p+='";
        text.replace(matcher, function (match, escape, interpolate, evaluate, offset) {
            source += text.slice(index, offset)
            .replace(escaper, function (match) { return '\\' + escapes[match]; });

            if (escape) {
                //source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
            }
            if (interpolate) {
                source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
            }
            if (evaluate) {
                source += "';\n" + evaluate + "\n__p+='";
            }
            index = offset + match.length;
            return match;
        });
        source += "';\n";

        if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

        source = "var __t,__p='',__j=Array.prototype.join," +
          "print=function(){__p+=__j.call(arguments,'');};\n" +
          source + "return __p;\n";

        try {
            render = new Function(settings.variable || 'obj', '_', source);
        } catch (e) {
            e.source = source;
            throw e;
        }

        if (data) return render(data, Bean);
        var template = function (data) {
            return render.call(this, data, Bean);
        };

        template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

        return template;
    }
    function stringFormat(text) {
        var t = slice.call(arguments, 1);
        return text.replace(reges, function () {
            return t[arguments[1]];
        });
    }
    function getUrlParam(key) {
        if ($.trim(key) == "" || url.indexOf(key + "=") < 0)
            return false;

        var reg = key + "=([^&]*)&?";
        return url.match(new RegExp(reg))[1];
    };
    function getUrlRoot() {
        return url.match(/^(.+?\.html)/)[1];
    };
    function getPlatform(){
        if(agent.indexOf('iphone')>-1) return 'ios';
        else if(agent.indexOf('android')>-1) return 'android';
        return "";
    }
    function getNetWork(){
       //if (agent.indexOf('network/wifi') > -1) network = "wifi";
       if(isapp){
          var m=agent.match(/network\/(.+?);/);
          return m?m[1]:'';
       }
       return "";
    }
    function toast (msg,t) {
        $toast.text(msg).show();
        setTimeout(function(){$toast.hide();},t?1000*t:1000*3);
    }
    function netError(){
        toast("网络跑到外太空去罗!");
    }
    function sysError(){
        toast("网络跑累了,请稍候再试!");
    }
    function request(obj) {
        var data = "body=" + JSON.stringify(obj.data);
        var jsonp = "callbackJsonp";
        var sa=Bean.sa||{};
        var url = sa[obj.url];
        if (!isdebug) url = url.replace(/&env=beta/, '').replace(/h5sh./, "h5.m.").replace(/beta.m.360buy.com/, "gw.m.jd.com");
        if (url.indexOf('h5api') > -1) {
            var _sid = obj.data.sid;
            if (_sid) delete obj.data['sid'];
            data = "body=" + JSON.stringify(obj.data) + "&sid=" + _sid;
            jsonp = undefined;
        }
        $.ajax({
            type: "GET",
            dataType: "jsonp",
            jsonp: jsonp,
            url: url,
            data: data,
            timeout: 10000,
            success: function (r) {
                obj.success(r);
            },
            error: obj.error ? obj.error : netError
        });

        return false;
    }
    function login(url) { 
        window.parent.location.href = 'https://passport.m.jd.com/user/login.action?v=1&returnurl=' + encodeURIComponent(url); 
    }
    function getVersion(){
        if(isapp){
            var a=agent.split(';');
            return a?a[2].replace(/\./g,''):"";
        }
        return "";
    }
    //设置微信分享
    function setChatConf(obj){
        if(!isChat) return;
        if(shareConfig){
            $.extend(shareConfig,{
                img:obj.pictureUrl,
                url:obj.shareUrl,
                desc:obj.content,
                title:obj.title,
                timeline_title:obj.title
            });
        }
    }
    //设置APP分享
    function setAppConf(obj){
        if(!isapp) return;
        var plat=sets.platform;
        if(plat=="ios"){
            location.href =stringFormat('openapp.jdmobile://communication?params={"action":"syncShareData","title":"{0}","content":"{1}","shareUrl":"{2}","iconUrl":"{3}"}', obj.title, obj.content, obj.shareUrl,obj.pictureUrl);
        }else if(plat=="android"){
            shareHelper.setShareInfo(s.title,s.content,s.shareUrl,s.pictureUrl);
        }

    }
    //唤起APP分享
    function callAppConf(obj){
        if(!isapp) return;
        var plat=sets.platform;
        if(plat=="ios"){
            location.href =stringFormat('openapp.jdmobile://communication?params={"action":"share","title":"{0}","content":"{1}","shareUrl":"{2}","iconUrl":"{3}"}', obj.title, obj.content, obj.shareUrl,obj.pictureUrl);
        }else if(plat=="android"){
            location.href =stringFormat('openapp.jdMobile://communication?params={"des":"share","type":"111",title":"{0}","content":"{1}","shareUrl":"{2}","iconUrl":"{3}"}', obj.title, obj.content, obj.shareUrl,obj.pictureUrl);
        }
    }
    //启APP
    function openApp(appurl,murl) {
        appurl=appurl?stringFormat('openApp.jdMobile://virtual?params={"category":"jump","des":"getCoupon","action":"to","url":"{0}"}',appurl):
              'openApp.jdMobile://virtual?params={"category":"jump","des":"HomePage","sourceType":"H5","sourceValue":"share"}';

        murl=murl?murl:"http://h5.m.jd.com/active/download/download.html";

        var g_sSchema = appurl;
        var g_sDownload = murl;
        var div, tid, startTime;
        if (isapp) {
            location.href = appurl;
        } else {
            startTime = Date.now(); 
            div = document.createElement('div');
            div.style.visibility = 'hidden';
            div.innerHTML = "<iframe src=" + g_sSchema + " scrolling=\"no\" width=\"1\" height=\"1\"></iframe>";
            document.body.appendChild(div);
            tid = setTimeout(function () {
                var delta = Date.now() - startTime; 
                if (delta < 1400) { 
                    location = g_sDownload;
                }
            }, 1200);
        }
    }
    function getTemplate(templateId){
       var cachedTemplate=templateCaches[templateId];
       function load(tid){
           return $(tid).html();
       }
       if(!cachedTemplate){
           cachedTemplate=load(templateId);
           templateCaches[templateId]=cachedTemplate;
       }
       return cachedTemplate;
    }
    function Region(node){
        this.$el=$(node);
    }
    Region.prototype={
        show:function(view){
            var node=this.$el;
            var currentView=this.currentView;
            if(view!=currentView){
                if(currentView){
                    currentView.close();
                    delete this.currentView;
                }

            }
            var vm=view.$el[0];
            //对vm进行扫描，对图片预加载
            node.empty().append(vm);
            this.currentView=view;
            return view;
        },
    };

    sets = {
        //View: inheritView,
        template: template,
        stringFormat: stringFormat,
        inherit: inherit,
        getUrlParam: getUrlParam,
        getUrlRoot: getUrlRoot,
        login:login,
        version:getVersion(),
        url:url,
        root: getUrlRoot(),
        platform:getPlatform(),
        agent:agent,
        isapp:isapp,
        isChat:isChat,
        w:$win.width(),
        h:$win.height(),
        toast:toast,
        netError:netError,
        sysError:sysError,
        request:request,
        isdebug:isdebug,
        setAppConf:setAppConf,
        setChatConf:setChatConf,
        callAppConf:callAppConf,
        openApp:openApp,
        getTemplate:getTemplate,
        Region:Region,
    };
    $.extend(Bean, sets);

    win['Bean'] = Bean; 

})(window, $);
