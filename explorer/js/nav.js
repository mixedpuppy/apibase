
// this contains primarily initialization and navigation related code,
// it calls into pages to initialize the display of any page that is
// navigated to

$(document).ready(function($) {
//dump("document.ready\n");
    function goPage(hash) {
        
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

    // setup the toolbar links
    $("nav li").click(function() {
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

    // initialize
    pages.init();

    $(window).hashchange( function(){
        goPage( location.hash ? location.hash : '#components' );
    })
    // remove design elements we dont want
    goPage('#components');
    
});

