
from baseapp import *
from routes import Mapper


class Index(BaseController):

    def index(self):
        return "this is the index"

    def view(self, item):
        return "this is a view [%s]" % item

    @api
    def ok(self):
        # accessing the session
        self.session['value'] = True
        self.session.save()
        return {"result": "success!"}

    @api
    def fail(self):
        raise Exception("FAIL WHALE")


map = Mapper()
map.connect('index', '/', controller=Index)
map.connect('view', '/view/{item}', controller=Index, action='view')
map.connect('api_ok', '/ok', controller=Index, action='ok')
map.connect('api_fail', '/fail', controller=Index, action='fail')


make_app = set_app(map)
