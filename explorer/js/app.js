// pages are attached to a page in the dom, and handle all dom manipulation

prettyPrint.config.styles = {
    array: {
        th: {
            backgroundColor: '#222222',
            backgroundImage: '-moz-linear-gradient(center top , #222222 0%, #1F1F1F  100%)'
        }
    },
    'function': {
        th: {
            backgroundColor: '#222222',
            backgroundImage: '-moz-linear-gradient(center top , #222222 0%, #1F1F1F  100%)'
        }
    },
    regexp: {
        th: {
            backgroundColor: '#222222',
            backgroundImage: '-moz-linear-gradient(center top , #222222 0%, #1F1F1F  100%)'
        }
    },
    object: {
        th: {
            backgroundColor: '#222222',
            backgroundImage: '-moz-linear-gradient(center top , #222222 0%, #1F1F1F  100%)'
        }
    },
    jquery : {
        th: {
            backgroundColor: '#222222',
            backgroundImage: '-moz-linear-gradient(center top , #222222 0%, #1F1F1F  100%)'
        }
    },
    error: {
        th: {
            backgroundColor: 'red',
            color: 'yellow'
        }
    },
    domelement: {
        th: {
            backgroundColor: '#222222',
            backgroundImage: '-moz-linear-gradient(center top , #222222 0%, #1F1F1F  100%)'
        }
    },
    date: {
        th: {
            backgroundColor: '#222222',
            backgroundImage: '-moz-linear-gradient(center top , #222222 0%, #1F1F1F  100%)'
        }
    },
    colHeader: {
        th: {
            backgroundColor: '#EEE',
            color: '#000',
            textTransform: 'uppercase'
        }
    },
    'default': {
        table: {
            borderCollapse: 'collapse',
            width: '100%'
        },
        td: {
            padding: '5px',
            fontSize: '12px',
            backgroundColor: '#FFF',
            color: '#222',
            border: '1px solid #000',
            verticalAlign: 'top',
            whiteSpace: 'nowrap'
        },
        td_hover: {
            /* Styles defined here will apply to all tr:hover > td,
                - Be aware that "inheritable" properties (e.g. fontWeight) WILL BE INHERITED */
        },
        th: {
            padding: '5px',
            fontSize: '12px',
            backgroundColor: '#222',
            color: '#EEE',
            textAlign: 'left',
            border: '1px solid #000',
            verticalAlign: 'top',
            backgroundRepeat: 'repeat-x'
        }
    }
};

var pages = {
    pages: {},
    home: null,
    get: function(id) {
      return this.pages[id];  
    },
    show: function goPage(id, data) {
        var page = this.pages[id];
        //dump('show page for '+id+' '+JSON.stringify(data)+"\n");
        if (page)
            page.show.apply(page, [data]);
    },
    add: function(page) {
        this.pages[page.id] = page;
    },
    init: function() {
        for (var page in this.pages) {
            this.pages[page].init();
            if (!this.home || this.pages[page].home)
                this.home = '#'+this.pages[page].id;
        }
        this.nav();
        this.toolbar();

        $(window).hashchange( function() {
            pages.go( location.hash ? location.hash : this.home );
        });
        // remove design elements we dont want
        pages.go(this.home);
    },
    nav: function() {
        // setup the toolbar links
        //dump("installing click handlers\n");
        $("nav li").click(function() {
            if ($(this).hasClass('back')) {
                history.go(-1);
                return;
            }
            var command = $(this).attr('data-for');
            var data = $(this).attr('data-value');
            var target = $('#'+command);
            var type = target.attr('data-role');
            //dump("got nav click for "+command+"/"+data+"\n");
            if (type === "page") {
                if (data)
                    location.hash = command + '/' + data;
                else
                    location.hash = command;
            } else
            if (type === "toolbar") {
                target.toggleClass('visible');
            }
                $(this).toggleClass("on off");
        });
    },
    toolbar: function() {
        // setup the toolbar links
        $("button.nav").click(function() {
            if ($(this).hasClass('back')) {
                history.go(-1);
                return;
            }
            var command = $(this).attr('data-for');
            var target = $('#'+command);
            var type = target.attr('data-role');
            
            if (type === "page") {
                location.hash = $(this).attr('data-for');
            } else
            if (type === "toolbar") {
                $(this).toggleClass("on off");
                target.toggleClass('visible');
            }
        });
    },
    go: function(hash) {
        var data = hash.substr(1).split("/");
        var page = data.shift();
        var target = $('#'+page);
        var menu = $("nav li."+page);
        //dump("page "+page+" data "+data+"\n");
        // change the menu highlight
        menu.siblings().removeClass('selected');
        menu.addClass('selected');
        
        target.addClass('selected');
        // change the page
        if (target.hasClass('secondary')) {
            $('body').addClass('secondary');
        } else {
            target.siblings().removeClass('selected');
            $('body').removeClass('secondary');
        }
        pages.show(page, data);
        
        // mo fuckin overflow
        $('.overflow').textOverflow(null,true);
    }
};

$(document).ready(function($) {
    pages.init();
});

pages.add({
    id: 'components',
    home: true,
    init: function() {
        //dump("initialize "+this.id+"\n");
        window.api = {
            directory: new Directory(),
            schema: new Schema()
        };
        // test /explorer/test/directory.json
        window.api.directory.load('/api/discover/v1/apis', function(data) {
            pages.get('components').renderDirectory();
            // load up the first api in the directory entry
            pages.get('components').show();
        });
    },
    renderDirectory: function() {
        //dump("rendering directory\n");
        $("#tmplDirectory")
            .tmpl( {'directory': window.api.directory.data} )
            .appendTo("#apptoolbar nav");
        pages.nav();
    },
    render: function() {
        var data = window.api.schema.data;
        $("#components .apiinfo").empty();
        $("#endpointList").empty();

        pages.get('components').renderResource(data.name, data);

        $("#endpointList li").click(function(e) {
            location.hash = "apicall/" + $(this).attr('id');
        });

        $("#tmplAPIDoc")
            .tmpl( {'schema': data} )
            .appendTo("#components .apiinfo");  
    },
    renderResource: function(endpoint, ep) {
        if (ep.methods) {
            $.each(ep.methods, function(methodName) {
                var fullname = endpoint+"."+methodName
                $("#tmplEndpointList")
                    .tmpl( {'id': fullname, 'name': fullname,'resource': ep.methods[methodName]} )
                    .appendTo("#endpointList");  
            });
        }
        if (ep.resources) {
            $.each(ep.resources, function(resourceName) {
                rp = ep.resources[resourceName];
                pages.get('components').renderResource(endpoint+"."+resourceName, rp);
            });
        }
    },
    show: function(data) {
        var url;
        if (data && data.length > 0) {
            url = data.join('/');
        } else if (window.api.directory.data) {
            url = window.api.directory.data.items[0].discoveryLink;
        } else {
            return;
        }

        window.api.directory.get(url, function(data) {
            pages.get('components').render();
            if (location.hash.split('/')[0] != '#components') {
                pages.go( location.hash );
            }
        });
    }
});

pages.add({
    id: 'apicall',
    init: function() {
    },
    show: function(endpoint) {
        var data = window.api.schema.getById(endpoint);
        //dump(endpoint+": "+JSON.stringify(data)+"\n");

        function getResponseObject() {
            var param;
            if (data && data.response) {
                $.each(data.response, function(pname) {
                    if (pname == '$ref') {
                        pname = data.response[pname];
                        param = window.api.schema.getById(pname);
                    }
                });
                if (param) {
                    return param
                }
            }
            return null;
        }
        var resp = getResponseObject();

        $('#apicall .apicallinfo h3').text(endpoint.toString());
        $('#apiCallData').empty();
        $('#apiResponseData').empty();
        //dump(endpoint+": "+JSON.stringify({'api': data, 'response': resp})+"\n");

        $("#tmplAPICallDoc")
            .tmpl( {'api': data, 'response': resp}, {
                getOrderedParameters: function() {
                    var params = [];
                    // first by order
                    if (data.parameterOrder) {
                        for (var i in data.parameterOrder) {
                            var pname = data.parameterOrder[i];
                            var param = data.parameters[pname];
                            if (pname == '$ref') {
                                param = window.api.schema.getById(param);
                            }
                            params.push([pname, param]);
                        }
                    }
                    if (data.parameters) {
                        $.each(data.parameters, function(pname) {
                            var param = data.parameters[pname];
                            if (pname == '$ref') {
                                param = window.api.schema.getById(param);
                            }
                            if (!data.parameterOrder || data.parameterOrder.indexOf(pname) < 0)
                                params.push([pname, param]);
                        });
                    }
                    return params;
                }

            })
            .appendTo("#apiCallData");  

        $("#submitCall").click(function() {
            $('#apiResponseData').empty();
            var id = $(this).attr('data-for');
            //dump("make a call now "+$(this).attr('data-for')+"\n");
            var cd = {};
            $("#apiCallData input").each(function() {
                cd[$(this).attr('name')] = $(this).val();
            });
            $("#apiCallData select").each(function() {
                cd[$(this).attr('name')] = $(this).val();
            });
            //dump("calldata : "+JSON.stringify(cd)+"\n");
            
            window.api.schema.call(id, cd, function(resp) {
                //dump("calldata : "+JSON.stringify(resp)+"\n");
                var tbl = prettyPrint( resp );
                $('#apiResponseData').append(tbl);
            });
        });
    }
});


