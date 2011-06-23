from decorator import decorator
import pprint
import json
import logging
from xml.sax.saxutils import escape

from routes import Mapper
from routes.util import URLGenerator
from webob.dec import wsgify
from webob import exc

log = logging.getLogger(__name__)


@decorator
def api(func, *args, **kwargs):
    try:
        data = func(*args, **kwargs)
    except exc.HTTPException:
        raise
    except Exception, e:
        log.exception("%s(%s, %s) failed", func, args, kwargs)
        data = {
            'result': None,
            'error': {
                'name': e.__class__.__name__,
                'message': str(e),
            }
        }

    inst = args[0]
    request = inst.request
    format = request.params.get('format', 'json')

    if format == 'test':
        request.response.headers['Content-Type'] = 'text/plain'
        return pprint.pformat(data)
    elif format == 'xml':

        # a quick-dirty dict serializer
        def ser(d):
            r = ""
            for k, v in d.items():
                if isinstance(v, dict):
                    r += "<%s>%s</%s>" % (k, ser(v), k)
                elif isinstance(v, list):
                    for i in v:
                        #print k,i
                        r += ser({k: i})
                else:
                    r += "<%s>%s</%s>" % (k, escape("%s" % v), k)
            return r
        request.response.headers['Content-Type'] = 'text/xml'
        return ('<?xml version="1.0" encoding="UTF-8"?>'
                + ser({'response': data}).encode('utf-8'))
    request.response.headers['Content-Type'] = 'application/json'
    res = json.dumps(data)
    return res


class BaseController(object):
    special_vars = ['controller', 'action']

    def __init__(self, request, url, config, app):
        self.request = request
        self.session = request.environ.get('beaker.session', {})
        self.url = url
        self.config = config
        self.app = app

    def __call__(self):
        action = self.request.match.get('action', 'index')
        if hasattr(self, '__before__'):
            self.__before__()
        kwargs = self.request.match.copy()
        for attr in self.special_vars:
            if attr in kwargs:
                del kwargs[attr]
        return getattr(self, action)(**kwargs)


class BaseApplication(object):
    def __init__(self, config, map):
        self.config = config
        self.map = map

    @wsgify
    def __call__(self, req):
        results = self.map.routematch(environ=req.environ)
        if not results:
            return exc.HTTPNotFound()
        match, route = results
        url = URLGenerator(self.map, req.environ)
        req.match = match
        req.route = route
        controller = match['controller'](req, url, self.config, self)
        return controller()


def set_app(map, appKlass=BaseApplication, wrapper=None):
    """make_app factory."""
    def make_app(global_conf, **app_conf):
        """Returns a WSGI Application."""
        global_conf.update(app_conf)
        app = appKlass(global_conf, map)

        if wrapper is not None:
            app = wrapper(app, global_conf)
        return app
    return make_app
