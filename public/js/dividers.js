var MIN_SIDEBAR_WIDTH = 200;
function setupDividers() {
    $('.divider-left').mousedown(function (e) {
        e.preventDefault();
        $(document).mousemove(function (e) {
            e.preventDefault();
            var x = e.pageX;
            if(x > MIN_SIDEBAR_WIDTH) {
                $('#filebrowser').css("width", x);
                $('#editor').css("left", x);
            }
        });
        $(document).mouseup(function (e) {
            $(document).unbind('mousemove');
        });
    });
    $('.divider-right').mousedown(function (e) {
        e.preventDefault();
        $(document).mousemove(function (e) {
            e.preventDefault();
            var docw = $(document).width();
            var x = docw-e.pageX;
            if(x > MIN_SIDEBAR_WIDTH) {
                $('#sidebar').css('width',x);
                $('#editor').css('right',x);
            }
        });
        $(document).mouseup(function (e) {
            $(document).unbind('mousemove');
        });
    });
}
