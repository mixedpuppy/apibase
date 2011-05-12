# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is webapi.
#
# The Initial Developer of the Original Code is
# Mozilla Messaging, Inc..
# Portions created by the Initial Developer are Copyright (C) 2009
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
# Shane Caraveo <scaraveo@mozilla.com> <shane@caraveo.com>

try:
    from setuptools import setup, find_packages
except ImportError:
    from ez_setup import use_setuptools
    use_setuptools()
    from setuptools import setup, find_packages

VERSION = '0.1.0'

setup(
    name='WebAPI',
    version=VERSION,
    description=('Web API.'),
    author='Mozilla Labs',
    author_email='scaraveo@mozilla.com',
    url='http://mozillalabs.com/',
    install_requires=[
        "PasteScript>=1.6.3",
        "webob",
        "routes",
        "beaker",
        "decorator",
        "docutils",
        "nose",
        "coverage",
        "httplib2",
        "python-memcached",
        "gunicorn",
        "gevent"
    ],
    packages=find_packages(exclude=['ez_setup']),
    include_package_data=True,
    test_suite='nose.collector',
    package_data={'webapi': ['i18n/*/LC_MESSAGES/*.mo']},
    message_extractors={'webapi': [
            ('**.py', 'python', None),
            ('templates/**.mako', 'mako', {'input_encoding': 'utf-8'}),
            ('public/**', 'ignore', None)]},
    zip_safe=False,
    paster_plugins=['PasteScript'],
    entry_points="""
    [paste.app_factory]
    main = webapi.wsgiapp:make_app

    [paste.app_install]
    main = paste.script.appinstall:Installer
    """,
)
