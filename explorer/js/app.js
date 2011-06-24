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
    get: function(id) {
      return this.pages[id];  
    },
    show: function goPage(id, data) {
        var page = this.pages[id];
        if (page)
            page.show.apply(page, data);
    },
    add: function(page) {
        this.pages[page.id] = page;
    },
    init: function() {
        for (var page in this.pages) {
            this.pages[page].init();
        }
    }
};

pages.add({
    id: 'components',
    init: function() {
        //dump("initialize "+this.id+"\n");
    },
    render: function() {
        var data = window.apiSchema.data;
        $("#components .apiinfo").empty();

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
    show: function() {
        if (!window.apiSchema) {
            window.apiSchema = new Schema()
            // test path /explorer/test/books.json
            window.apiSchema.load('/api/schema', function(data) {
                pages.get('components').render();
            });
        }
    }
});

pages.add({
    id: 'apicall',
    init: function() {
    },
    show: function(endpoint) {
        var data = window.apiSchema.getById(endpoint);
        //dump(endpoint+": "+JSON.stringify(data)+"\n");

        function getResponseObject() {
            var param;
            if (data.response) {
                $.each(data.response, function(pname) {
                    if (pname == '$ref') {
                        pname = data.response[pname];
                        param = window.apiSchema.getById(pname);
                    }
                });
                if (param) {
                    return param
                }
            }
            return null;
        }
        var resp = getResponseObject();

        $('#apicall .apicallinfo h3').text(endpoint);
        $('#apiCallData').empty();
        $('#apiResponseData').empty();

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
                                param = window.apiSchema.getById(param);
                            }
                            params.push([pname, param]);
                        }
                    }
                    if (data.parameters) {
                        $.each(data.parameters, function(pname) {
                            var param = data.parameters[pname];
                            if (pname == '$ref') {
                                param = window.apiSchema.getById(param);
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
                cd[$(this).attr('id')] = $(this).val();
            });
            //dump("calldata : "+JSON.stringify(cd)+"\n");
            
            window.apiSchema.call(id, cd, function(resp) {
                //dump("calldata : "+JSON.stringify(resp)+"\n");
                var tbl = prettyPrint( resp );
                $('#apiResponseData').append(tbl);
            });
        });
    }
});


