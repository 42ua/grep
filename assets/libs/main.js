 "use strict";

$(function() {

  (function() {

    var parseId;

    function parse() {
      if (parseId) {
        clearTimeout(parseId);
      }

      parseId = setTimeout(function () {
        var input = $("#grep-stdin").val(),
            args = $("#grep-cmd").val(),
            output = fn_gnu_grep(input, args);
        output = output.replace(/\n$/, "");
        output = $('<div/>').text(output).html();
        output = output.replace(
          /\u001B\[01;31m\u001B\[K(.+?)\u001B\[m\u001B\[K/g, 
          "<span style='color:red'>$1</span>");
        output = output.replace(
          /\u001B\[35m\u001B\[K(.+?)\u001B\[m\u001B\[K/g, 
          "<span style='color:magenta'>$1</span>");
        output = output.replace(
          /\u001B\[32m\u001B\[K(.+?)\u001B\[m\u001B\[K/g, 
          "<span style='color:green'>$1</span>");
        output = output.replace(
          /\u001B\[36m\u001B\[K(.+?)\u001B\[m\u001B\[K/g, 
          "<span style='color:cyan'>$1</span>");
        $("#grep-stdout").html(output);
      }, 333);
    }

    $("#grep-stdin").keyup(parse);
    $("#grep-cmd").keyup(parse);

  })();

  /* copy {white-space: pre;} with new lines */

  (function() {

    /* https://developer.mozilla.org/en-US/docs/Web/Events/copy */

    $("#grep-stdout").bind('copy', function(e) {
      var oe = e.originalEvent,
          docFragment = window.getSelection().getRangeAt(0).cloneContents();
      oe.clipboardData.setData('text/plain', $(docFragment).text() || $("#grep-stdout").text());
      oe.preventDefault(); // We want our data, not data from any selection, to be written to the clipboard
    });
  })();

  /* options */

  (function() {
    $(".grep-options.dropdown-menu li a").click(function() {
      var val = $(this).text();
      var newVal = ['--help', '--version'].indexOf(val) > -1 
        ? val
        : val + ' ' + $("#grep-cmd").val();
      $("#grep-cmd").val(newVal).keyup();
    });
  })();

  /* Gist API */

  (function() {
    $("li a.gist-api").click(function() {
      $.post('https://api.github.com/gists', 
        JSON.stringify({
          "description": "grep.js",
          "files": {
            "stdin": {"content": $("#grep-stdin").val()},
            "stdout": {"content": $("#grep-stdout").text()},
            "args": {"content": $("#grep-cmd").val()}
          }
        })
      ).done(function(response) {
        var url = response.html_url,
            my = $(location).attr('href').replace(/(#|\?).*$/, "") + '?gist=' + response.id;
        $(".user-errors-here").append( "<div class='alert alert-success alert-dismissible fade in' role=alert>" + 
          "<button type=button class=close data-dismiss=alert aria-label=Close><span aria-hidden=true>&times;</span></button>" + 
          "<strong>GIST:</strong> <a href='" + url + "'>" + response.id + "</a> | " + 
          "<strong>Share:</strong> <a href='" + my + "'>me</a>" + 
          "</div>"
        );
      }).fail(function( e ) {
        $(".user-errors-here").append( "<div class='alert alert-danger alert-dismissible fade in' role=alert>" + 
          "<button type=button class=close data-dismiss=alert aria-label=Close><span aria-hidden=true>&times;</span></button>" + 
          "<strong>Holy guacamole!</strong> " + [e.status, e.statusText] + "</div>"
        );
      });
    });
  })();

});

/* Gist load or default */

(function() {
  function getParameterByName(name, url) {
      if (!url) url = window.location.href;
      name = name.replace(/[\[\]]/g, "\\$&");
      var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
          results = regex.exec(url);
      if (!results) return null;
      if (!results[2]) return '';
      return decodeURIComponent(results[2].replace(/\+/g, " "));
  }

  var user = getParameterByName('user') || 'anonymous',
    gistId = getParameterByName('gist') || 'c077861c4e2f4095498aab9b0fd2ced0';

  if (user && gistId) {
    var stdinGist = getParameterByName('stdin') || 'stdin',
        argsGist = getParameterByName('args') || 'args',
        doc_ready = $.Deferred();

    /* http://stackoverflow.com/q/10326398 */

    $(doc_ready.resolve);

    $.when( 
      $.get( 'https://gist.githubusercontent.com/' + user + '/' + gistId + '/raw/' + stdinGist ), 
      $.get( 'https://gist.githubusercontent.com/' + user + '/' + gistId + '/raw/' + argsGist ),
      doc_ready )
    .then(function( stdin, args ) {
      var rows = args[0].split(/\r\n|\r|\n/).length;
      $("#grep-cmd").val(args[0]).attr("rows", rows).css({"height": rows > 1 ? "auto" : "34px"});
      // document.ready() callbacks are called in the order they were registered. 
      // If you register your testing callback first, it will be called first
      // keyup() listener is registered earlier in this file
      $("#grep-stdin").val(stdin[0]).keyup();
    })
    .fail(function( e ) {
      $(".user-errors-here").append( "<div class='alert alert-danger alert-dismissible fade in' role=alert>" + 
        "<button type=button class=close data-dismiss=alert aria-label=Close><span aria-hidden=true>&times;</span></button>" + 
        "<strong>Holy guacamole!</strong> " + [e.status, e.statusText] + "</div>"
      );
    });
  }
})();