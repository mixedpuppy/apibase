
import logging
import re
import types
import imp
import sys
import inspect
from decorator import decorator
from docutils import core
# jsonor https://bitbucket.org/knikita/jsonor/
# forked to https://bitbucket.org/mixedpuppy/jsonor
from jsonor import validate, ValidationError, SchemaCatalog, schema_uri

from apibase import BaseController, api, map

log = logging.getLogger(__name__)

@decorator
def api_validate(func, *args, **kwargs):
    """api_validate decorator
    
    provides a basic level of input validation based on provided schema data.
    it does not consider PATH variables or differentiate between GET and
    POST variables.
    """
    if hasattr(func, "__api"):
        inst = args[0]
        request = inst.request
        api = func.__api
        params = api.get('parameters', {})
        path_params = {}
        req_params = {}
        for k, t in params.items():
            if t.get('location') == 'path':
                path_params[k]=t
            else:
                req_params[k]=t

        # validate PATH variables
        to_validate = {}
        paramOrder = api.get('parameterOrder', None)
        if paramOrder:
            for i in range(1, len(args)):
                to_validate[paramOrder[i-1]] = args[i]
            if to_validate:
                validate(to_validate, {'properties': path_params})
                    
        # validate GET/POST vars
        to_validate = dict(request.params)
        if params and to_validate:
            validate(to_validate, {'properties': req_params})            

    return func(*args, **kwargs)

def api_entry(**kw):
    """Decorator to add tags to functions.
    """
    def decorate(f):
        if not hasattr(f, "__api"):
            f.__api = kw
        if not getattr(f, "__doc__") and 'doc' in kw:
            doc = kw['doc'] + "\n"
            if 'name' in kw:
                doc = kw['name'] + "\n" + "=" * len(kw['name']) + "\n\n" + doc
            args = []
            for name, m in dict(kw.get('parameters', {})).items():
                line = "  %-20s" % name + "%(type)-10s %(description)s" % m
                opts = []
                if m['required']:
                    opts.append("required")
                if m['default']:
                    opts.append("default=%s" % m['default'])
                if m['enum']:
                    opts.append("options=%r" % m['enum'])
                if m['location']:
                    opts.append("location=%r" % m['location'])
                if opts:
                    line = "%s (%s)" % (line, ','.join(opts),)
                args.append(line)
            d = "Parameters\n-------------\n\n%s\n\n" % '\n'.join(args)
            if 'bodyargs' in kw:
                args = []
                assert 'body' not in kw, "can't specify body and bodyargs"
                for m in kw['bodyargs']:
                    line = "  %(name)-20s %(type)-10s %(description)s" % m
                    opts = []
                    if m['required']:
                        opts.append("required")
                    if m['default']:
                        opts.append("default=%s" % m['default'])
                    if m['allowed']:
                        opts.append("options=%r" % m['allowed'])
                    if opts:
                        line = "%s (%s)" % (line, ','.join(opts),)
                    args.append(line)
                d = d + ("**Request Body**: A JSON object with the "
                        "following fields:\n")
                d = d + "\n".join(args) + "\n\n"
            elif 'body' in kw:
                d = d + ("**Request Body**:  %(type)-10s %(doc)s\n\n"
                        % kw['body'])
            if 'response' in kw:
                d = d + ("**Response Body**: %(type)-10s %(doc)s\n\n"
                        % kw['response'])
            f.__doc__ = doc + d
        return f
    return decorate


def api_param(type=None, required=False, default=None, enum=None,
            location=None, description=None):
    return {
        'type': type,
        'required': required,
        'default': default,
        'enum': enum,
        'description': description or '',
        'location': location or 'query',
    }


def reST_to_html_fragment(a_str):
    parts = core.publish_parts(
                          source=a_str,
                          writer_name='html')
    return parts['body_pre_docinfo'] + parts['fragment']


def import_module(partname, fqname, parent):
    try:
        return sys.modules[fqname]
    except KeyError:
        pass
    try:
        fp, pathname, stuff = imp.find_module(partname,
                                              parent and parent.__path__)
    except ImportError:
        return None
    try:
        m = imp.load_module(fqname, fp, pathname, stuff)
    finally:
        if fp:
            fp.close()
    if parent:
        setattr(parent, partname, m)
    return m


def getmodule(module_name):
    # XXX this was specific to an application, need to handle discovery of
    # controller classes
    raise Exception('NOT IMPLEMENTED')
    print "module is ",module_name
    # XXX this should be generic and be able to auto-discover our controllers
    import some_module.controllers
    fqname = "some_module.controllers." + module_name
    try:
        return import_module(module_name, fqname, some_module.controllers)
    except ImportError, e:
        print "import error %s %r" % (module_name, e)
        return None


def getclass(module, classname):
    if classname not in dir(module):
        return None
    for (name, class_) in inspect.getmembers(module):
        if name == classname:
            break
        class_ = None
    if not class_ or not '__api_controller__' in class_.__dict__:
        return None
    return class_

from routes.util import URLGenerator

def generateSchema(app, req):
    """generateSchema
    
    generates a json schema from api_entry data and attaches the schema
    to the app object for later retreival via http get calls.  It also
    generates some data based on Routes information and attaches that
    to existing api_entry dicts for later validation use."""

    # XXX we have to do this on the first request in order to get the proper
    # path prefixes for url use.

    # iterate through our routes and get the controller classes
    mapper = app.map
    url = URLGenerator(mapper, req.environ)
    if hasattr(app, "__api"):
        schema = dict(getattr(app, "__api"))
    else:
        schema = {
            "name": app.__class__.__name__.lower()
        }
        setattr(app, '__api', schema)
    setattr(app, 'schema', schema)

    schema["kind"] = "discovery#restDescription"
    schema["protocol"] = "rest"
    schema["basePath"] = url('/')
    appname = schema.get('name')

    resources = schema['resources'] = {}
    for m in mapper.matchlist:
        module_name = m.defaults.get('controller', None)
        if not module_name:
            continue

        if isinstance(module_name, types.StringTypes):
            # we're currently not supporting strings for controllers
            raise Exception('NOT IMPLEMENTED')
            if module_name in resources:
                # we've already got docs for this controller, just backfill
                # some additional data
                action = resources[module_name]['methods'].get(
                    m.defaults['action'], None)
                action['path'] = url(m.routepath)
                continue

            # this is the first hit for this controller import the
            # module and create all documentation for the controller,
            # we'll backfill some data from Routes as we process more
            # mappings
            module = getmodule(module_name)
            if not module:
                continue

            classname = module_name.title().lower()
            class_ = getclass(module, classname)
            if not class_:
                continue
        elif isinstance(module_name, types.ObjectType):
            classname = module_name.__name__.lower()
            class_ = module_name
        else:
            raise Exception("Invalid module_name %r", module_name)

        doc = inspect.getdoc(class_)
        doc = doc and reST_to_html_fragment(doc)
        class_data = resources.get(classname,
            {
                'description': doc,
                'methods': {},
            }
        )
        action = m.defaults.get('action','index')
        for (name, method) in inspect.getmembers(class_):
            if not isinstance(method, types.MethodType):
                continue
            if name != action:
                continue
            if not hasattr(method, '__api'):
                continue
            f = class_data['methods'][name] = getattr(method, '__api', {})
            if 'doc' in f:
                f['doc'] = reST_to_html_fragment(f['doc'])
            else:
                doc = inspect.getdoc(method)
                if doc:
                    f['doc'] = doc and reST_to_html_fragment(doc)
            if hasattr(m, 'name') and m.name:
                f['id'] = "%s.%s.%s.%s" % (appname, m.name, classname, name)
            else:
                f['id'] = "%s.%s.%s" % (appname, classname, name)
            if 'httpMethod' not in f:
                f['httpMethod'] = m.conditions and m.conditions.get('method', ['GET'])[0] or 'GET'
            path = f['path'] = m.routepath[1:]
            parameterOrder = re.findall(r'\{(.*?)\}', path, re.U)
            if parameterOrder:
                f['parameterOrder'] = parameterOrder
                if 'parameters' not in f:
                    f['parameters'] = {}
                for param in parameterOrder:
                    if param not in f['parameters'].keys():
                        f['parameters'][param] = {
                            'type': 'string',
                            'location': 'path',
                            'required': True
                        }

        resources[classname] = class_data


class Apis(BaseController):
    """
API Documentation
=================

Returns structured information about the API in JSON Schema format, for use in
user interfaces that want to show an API reference.

"""
    __api_controller__ = True  # for docs


    @api
    @api_validate
    @api_entry(
        description="Returns a json object containing documentation",
        parameters={
            'api': api_param('string', True, None, None, 'path','Name of the API being requested'),
            'version': api_param('string', True, 'v1', None, 'path','Version of the API'),
            'kind': api_param('string', True, 'rest', None, 'path','API protocol'),
            'label': api_param('string', False, None, None, 'query','Status label for the API e.g. labs'),
            'name': api_param('string', False, None, None, 'query','Restrict results to APIs with the provided name'),
            'prefered': api_param('boolean', False, False, None, 'query','Restrict results according to whether or not the APIs are the latest stable versions.'),
            'prettyprint': api_param('boolean', False, False, None, 'query','Return the response in a human-readable, indented format if true.'),
        },
        response={'type': 'object',
                  'description': ('A JSON schema object that describes the API '
                          'methods and parameters.')})
    def getRest(self, api, version, kind):
        schema = getattr(self.app, "schema")
        if schema.get('name') == api:
            return getattr(self.app, "schema")
        else:
            raise Exception("NOT IMPLEMENTED")
        
    @api
    @api_validate
    @api_entry(
        description="Returns a json object containing the discovery directory",
        parameters={
            'prettyprint': api_param('boolean', False, False, None, 'query','Return the response in a human-readable, indented format if true.'),
        },
        response={'type': 'object',
                  'description': 'directory json object'})
    def list(self):
        schema = getattr(self.app, "schema")

        dir = {}
        dir["kind"] = "discovery#directoryList"
        items = dir["items"] = []
        items.append({
            "kind": "discovery#directoryItem",
            "id": schema.get("id"),
            "name":schema.get("name"),
            "version": schema.get("version"),
            "title": schema.get("title"),
            "description": schema.get("description"),
            "discoveryLink": '/'.join(['.','apis',
                                      schema.get("name"),
                                      schema.get("version", "v1"),
                                      schema.get("protocol", "rest")]),
            "icons": schema.get("icons"),
            "documentationLink": schema.get("documentationLink"),
            "labels": schema.get("labels"),
            "preferred": schema.get("preferred", True)
        })
        return dir

with map.submapper(path_prefix='/discovery/v1') as disco:
    disco.connect('discovery', '/apis/{api}/{version}/{kind}', controller=Apis, action='getRest')
    disco.connect('discovery', '/apis', controller=Apis, action='list')


if __name__ == '__main__':  # pragma: no cover

    @api_entry(
        name="contacts",
        body={'type': "json", 'doc': "A json object"},
        httpMethod="GET",
        doc="""
See Portable Contacts for api for detailed documentation.

http://portablecontacts.net/draft-spec.html

**Examples**::

    /contacts                        returns all contacts
    /contacts/@{user}/@{group}       returns all contacts (user=me, group=all)
    /contacts/@{user}/@{group}/{id}  returns a specific contact

""",
        parameters={
            'user': api_param('string', True, None, ['me'], 'path',
                            'User to query'),
            'group': api_param('string', True, None, ['all', 'self'], 'path',
                             'Group to query'),
            'id': api_param('integer', False, None, None, 'path',
                          'Contact ID to return'),
            # name, type, required, default, allowed, doc
            'filterBy': api_param('string', False, None, None, 'query',
                                'Field name to query'),
            'filterOp': api_param('string', False, None,
                    ['equals', 'contains', 'startswith', 'present'], 'query',
                    'Filter operation'),
            'filterValue': api_param('string', False, None, None, 'query',
                    'A value to compare using filterOp '
                    '(not used with present)'),
            'startIndex': api_param('int', False, 0, None, 'query',
                    'The start index of the query, used for paging'),
            'count': api_param('int', False, 20, None, 'query',
                    'The number of results to return, used with paging'),
            'sortBy': api_param('string', False, 'ascending',
                    ['ascending', 'descending'], 'query',
                    'A list of conversation ids'),
            'sortOrder': api_param('string', False, 'ascending',
                    ['ascending', 'descending'], 'query', 'A list of conversation ids'),
            'fields': api_param('list', False, None, None, 'query',
                    'A list of fields to return'),
        },
        response={'type': 'object',
                  'doc': ('An object that describes the API methods '
                          'and parameters.')})
    def foo():
        pass
    print foo.__doc__
