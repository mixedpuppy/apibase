
function Schema(url) {
    this.data = null;
}
Schema.prototype = {
    load: function(schemaUrl, cb) {
        var self = this;
        $.ajax({
            url: schemaUrl,
            type: "GET",
            success: function(data, textStatus, jqXHR) {
                //dump("data: "+JSON.stringify(data)+"\n");
                self.data = data;
                if (cb)
                    cb(data);
            },
            error: function(jqXHR, errorStr, ex) {
            }
        });
    },
    
    getById: function(id, schemaObj) {
        if (!schemaObj) schemaObj = this.data;
        if (schemaObj.id && schemaObj.id === id) return schemaObj;
        if (schemaObj.methods) {
            for (key in schemaObj.methods) {
                o = this.getById(id, schemaObj.methods[key]);
                if (o) return o;
            }
        }
        if (schemaObj.resources) {
            for (key in schemaObj.resources) {
                o = this.getById(id, schemaObj.resources[key]);
                if (o) return o;
            }
        }
        if (schemaObj.schemas) {
            for (key in schemaObj.schemas) {
                o = this.getById(id, schemaObj.schemas[key]);
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
    
    call: function(id, data, cb) {
        var method = this.getById(id);
        var path = this.interpolatePath(this.data.basePath + method.path, data);
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
