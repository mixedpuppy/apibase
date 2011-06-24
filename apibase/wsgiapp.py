
from apibase.baseapp import *
from apibase.schema import APIDescription, api_entry, api_param, api_validate, generateSchema
from routes import Mapper
from webob.dec import wsgify


class Test(BaseController):

    @api
    @api_entry(
        description="default handler for a controller",
        response={'type': 'string',
                  'doc': ('this is the index')})
    def index(self):
        return {"result": "this is the index"}

    @api
    @api_validate
    @api_entry(
        description="an example view method",
        parameters={
            'item': api_param('string', True, None, ['me'], 'path','User to query'),
        },
        response={'type': 'string',
                  'description': ('returns html view')})
    def view(self, item):
        return {"result": "this is a view [%s]" % item}

    @api
    @api_entry(
        description="test success method",
        response={'type': 'object',
                  'description': ('allways a success object')})
    def ok(self):
        # accessing the session
        self.session['value'] = True
        self.session.save()
        return {"result": "success!"}

    @api
    @api_entry(
        description="an example exception failure",
        response={'type': 'object',
                  'description': ('throws an exception')})
    def fail(self):
        raise Exception("FAIL WHALE")

@api_entry(
    name='myapp',
    version='v1',
    description="A test wsgi api",
    title="Test API Docs",
    labels=['labs'],
    icons={'x16': 'https://mozillalabs.com/wp-content/themes/labs2.0/favicon.png'}
)
class myApp(BaseApplication):
    schema = None
    @wsgify
    def __call__(self, req):
        if not self.schema:
            generateSchema(self, req)
        return super(myApp, self).__call__(req)

map = Mapper()
with map.submapper(path_prefix='/v1') as v1:
    v1.connect('/', controller=Test)
    v1.connect('/view/{item}', controller=Test, action='view')
    v1.connect('/ok', controller=Test, action='ok')
    v1.connect('/fail', controller=Test, action='fail')
map.connect('/schema', controller=APIDescription, action='schema')


make_app = set_app(map, appKlass=myApp)
