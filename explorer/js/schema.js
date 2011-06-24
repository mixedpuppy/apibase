
var schema = {

    load: function(schemaUrl, cb) {

        $.ajax({
            url: schemaUrl,
            type: "GET",
            success: function(data, textStatus, jqXHR) {
                //dump("data: "+JSON.stringify(data)+"\n");
                if (cb)
                    cb(data);
            },
            error: function(jqXHR, errorStr, ex) {
            }
        });
    },
    
    getById: function(obj, id) {
        if (obj.id && obj.id === id) return obj;
        if (obj.methods) {
            for (key in obj.methods) {
                o = this.getById(obj.methods[key], id);
                if (o) return o;
            }
        }
        if (obj.resources) {
            for (key in obj.resources) {
                o = this.getById(obj.resources[key], id);
                if (o) return o;
            }
        }
        if (obj.schemas) {
            for (key in obj.schemas) {
                o = this.getById(obj.schemas[key], id);
                if (o) return o;
            }
        }
        return null;
    },
    
    interpolatePath: function(path, data) {
        var m = path.match(/{(.*?)}/g);
        for (var i in m) {
            var n = m[i].slice(1,-1);
            if (data[n]) {
                path = path.replace(m[i], data[n]);
                delete data[n];
            }
        }
        return path;
    },
    
    call: function(schemaObj, id, data, cb) {
        var method = this.getById(schemaObj, id);
        var path = this.interpolatePath(schemaObj.basePath + method.path, data);
        //dump("calling "+path+" with "+JSON.stringify(data)+"\n");

        $.ajax({
            url: path,
            type: method.httpMethod,
            data: data,
            success: function(data, textStatus, jqXHR) {
                //dump("data: "+JSON.stringify(data)+"\n");
                if (cb)
                    cb(data);
            },
            error: function(jqXHR, errorStr, ex) {
                if (cb)
                    cb(errorStr);
            }
        });        
    }
}
