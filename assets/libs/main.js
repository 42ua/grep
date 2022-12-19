 "use strict";

$(function() {

  (function() {

    var parseId, cacheInput, cacheArgs;

    function parse() {
      if (parseId) {
        clearTimeout(parseId);
      }

      parseId = setTimeout(function () {
        var input = $("#grep-stdin").val(),
            args = $("#grep-cmd").val(),
            output;

        if (cacheInput !== input || cacheArgs !== args){
          cacheInput = input;
          cacheArgs = args;

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
        }
      }, 333);
    }

    $("#grep-stdin").on('keyup input', parse);
    $("#grep-cmd").on('keyup input', parse);

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
      var formData = new FormData();
      formData.append("file",  new File([$("#grep-stdin").val()], 'stdin', {type: 'text/plain'}));
      formData.append("file",  new File([$("#grep-stdout").val()], 'stdout', {type: 'text/plain'}));
      formData.append("file",  new File([$("#grep-cmd").val()], 'cmd', {type: 'text/plain'}));
      formData.append('title', 'grep.js');
      $.ajax({
        cache: false,
        contentType: false,
        processData: false,
        type: "POST",
        url: 'https://api.bitbucket.org/2.0/snippets/grepjs',
        headers: {
          'Authorization': 'Basic bWF6a29ib3Q6QVRCQnNRblEzejU0Qks1QUJlUXQ0ejJYVU5hRzIxNjhBNTlC'
        },
        data: formData,
      }).done(function(response) {
        var url = response.links.html.href,
            my = $(location).attr('href').replace(/(#|\?).*$/, "") + '?snippet=' + response.id;
        $(".user-errors-here").append( "<div class='alert alert-success alert-dismissible fade in' role=alert>" + 
          "<button type=button class=close data-dismiss=alert aria-label=Close><span aria-hidden=true>&times;</span></button>" + 
          "<strong>Snippet:</strong> <a href='" + url + "'>" + response.id + "</a> | " + 
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
  var params    = new URLSearchParams(window.location.search),
      gistId    = params.get('gist'),
      snippetId = params.get('snippet') || 'q7KKKG',
      doc_ready = $.Deferred();

  /* http://stackoverflow.com/q/10326398 */

  $(doc_ready.resolve);

  if (gistId) {
    var content = $.when(
      $.get( 'https://api.github.com/gists/' + gistId),
      doc_ready )
    .then(function( data ) {
      try { return { args: data[0].files.args.content, stdin: data[0].files.stdin.content }; }
      catch(e) { return $.Deferred().reject({ statusText: 'invalid gist format', status: -1 }); }
    });
  } else {
    var content = $.when(
      $.get( 'https://api.bitbucket.org/2.0/snippets/grepjs/' + snippetId + '/files/cmd'),
      $.get( 'https://api.bitbucket.org/2.0/snippets/grepjs/' + snippetId + '/files/stdin'),
      doc_ready )
    .then(function( data_args, data_stdin ) {
      return { args: data_args[0], stdin: data_stdin[0] };
    });
  }

  content.then(function( data ) {
      var args  = data.args,
          rows  = args.split(/\r\n|\r|\n/).length,
          stdin = data.stdin;
      $("#grep-cmd").val(args).attr("rows", rows).css({"height": rows > 1 ? "auto" : "34px"});
      // document.ready() callbacks are called in the order they were registered.
      // If you register your testing callback first, it will be called first
      // keyup() listener is registered earlier in this file
      $("#grep-stdin").val(stdin).keyup();
    })
    .fail(function( e ) {
      $(".user-errors-here").append( "<div class='alert alert-danger alert-dismissible fade in' role=alert>" +
        "<button type=button class=close data-dismiss=alert aria-label=Close><span aria-hidden=true>&times;</span></button>" +
        "<strong>Holy guacamole!</strong> " + [e.status, e.statusText] + "</div>"
      );
    });

})();