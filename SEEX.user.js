// ==UserScript==
// @name         Stack Exchange Editor Extra
// @namespace    http://stackexchange.com/users/4337810/
// @version      1.0
// @description  A userscript that adds some extra features to the standard Stack Exchange Markdown Editor
// @author       ᔕᖺᘎᕊ (http://stackexchange.com/users/4337810/)
// @match        *://*.stackexchange.com/*
// @match        *://*.stackoverflow.com/*
// @match        *://*.superuser.com/*
// @match        *://*.serverfault.com/*
// @match        *://*.askubuntu.com/*
// @match        *://*.stackapps.com/*
// @match        *://*.mathoverflow.net/*
// @require      https://cdn.rawgit.com/dwieeb/jquery-textrange/1.x/jquery-textrange.js
// @require      https://cdn.rawgit.com/jeresig/jquery.hotkeys/master/jquery.hotkeys.js
// @grant        none
// ==/UserScript==
//TODO: Side By Side Editing for EDITS

var SEEX = {
    init: function(wmd) {
        var s = '#'+wmd; //s is the selector we pass onto each function so the action is applied to the correct textarea (and not, for example the 'add answer' textarea *and* the 'edit' textarea!)
        SEEX.startInsertLink(s);
        SEEX.startInsertImages(s);
        SEEX.betterTabKey(s);
        SEEX.keyboardShortcuts(s);
        
        $('head').append("<link rel='stylesheet' type='text/css' href='https://rawgit.com/shu8/Stack-Exchange-Editor-Pro/master/allCss.css' />");
        
        $(s).before("<span class='SEEX-toolbar' id='SEEX|"+s+"'>&nbsp;<span id='startAce'>Insert code (Ace editor)</span> | <span id='findReplace'>Find & Replace</span> | <span id='surroundKbd'>KBD-ify</span> | <span id='autoCorrect'>Auto correct</span>  | <span id='sideBySide'>Side-by-side editing</span></span>");

        $('#startAce').click(function(e) {
            SEEX.startAceEditor(s);
            e.preventDefault();
            e.stopPropagation();
        });
        $('#surroundKbd').click(function(e) {
            SEEX.addKbd($(this).parent().attr('id').split('|')[1]);
            e.preventDefault();
            e.stopPropagation();
        });
        $('#findReplace').click(function(e) {
            SEEX.findReplace($(this).parent().attr('id').split('|')[1]);
            e.preventDefault();
            e.stopPropagation();
        });
        $('#autoCorrect').click(function(e) {
            SEEX.autoCorrect($(this).parent().attr('id').split('|')[1]);
            e.preventDefault();
            e.stopPropagation();
        });
        $('#sideBySide').click(function(e) {
            SEEX.startSBS($(this).parent().attr('id').split('|')[1]);
            e.preventDefault();
            e.stopPropagation();
        });
        $(document).on('click', '.SEEX-closeDialog', function() {
            $(this).parent().hide(); 
        });
        
        $(document).click(function(event) { 
            //doesn't work with #SEEX-aceEditor for some reason... so skip it
            if(!$(event.target).closest('#SEEX-insertLinkDialog, #SEEX-insertImageDialog').length) {
                $('#SEEX-insertLinkDialog, #SEEX-insertImageDialog').hide()
            }
        });
    },
    
    startAceEditor: function(s) {
        var aceDiv = "<div id='SEEX-aceEditor' class='wmd-prompt-dialog SEEX-centered' style='position:fixed;'> \
              <select class='SEEX-aceLanguages'></select>\
              <button class='SEEX-addCode'>Add code</button>\
              <span class='SEEX-closeDialog'>x</span>\
              <h2>Ace Editor</h2>\
              <div id='editor'></div>\
          </div>";

        var languages = {
            'CoffeeScript': 'coffee',
            'CSS': 'css',
            'HTML': 'html',
            'JavaScript': 'javascript',
            'JSON': 'json',
            'PHP': 'php',
            'XML': 'xml',
            'AppleScript': 'applescript',
            'Cobol': 'cobol',
            'C#': 'csharp',
            'Python': 'python',
            'Ruby': 'ruby'
        };

        $('body').append(aceDiv);

        $.each(languages, function (lang, file) {
            $('select.SEEX-aceLanguages').append("<option value='"+file+"'>"+lang+"</option>");
        });

        $('select.SEEX-aceLanguages option[value="javascript"]').prop('selected', true);

        var scripts = ['https://cdn.rawgit.com/ajaxorg/ace-builds/master/src/ace.js', 'https://cdn.rawgit.com/ajaxorg/ace-builds/master/src/ext-language_tools.js'],
            head = document.getElementsByTagName("head")[0],
            editor;

        for(i=0;i<scripts.length;i++){
            var script = document.createElement('script');
            script.type = 'text/javascript'
            script.src = scripts[i];
            head.appendChild(script);
        }

        setTimeout(function() {
            editor = ace.edit("editor");
            editor.setTheme("ace/theme/github");
            editor.getSession().setMode("ace/mode/javascript");
            editor.setOptions({
                enableBasicAutocompletion: true,
                enableSnippets: true,
                enableLiveAutocompletion: true
            });
        }, 1000);

        $('select.SEEX-aceLanguages').on('change', function() {
            editor.getSession().setMode("ace/mode/"+$(this).val());
        });

        $(document).on('click', '.SEEX-addCode', function() {
            code = editor.getValue();
            var codeToAdd = '',
                gap = "    ",
                lines = code.split("\n"),
                pos = $(s).textrange('get', 'position'),
                oldVal = $(s).val();

            for(i = 0; i < lines.length; i++) {
                codeToAdd += gap + lines[i] + '\n';
            }

            //http://stackoverflow.com/a/15977052/3541881:
            $(s).val(oldVal.substring(0, pos) + codeToAdd + oldVal.substring(pos));
            
            SEEX.refreshPreview();
        });
    },
    
    startInsertLink: function(s) {
        var linkDiv = "<div id='SEEX-insertLinkDialog' class='wmd-prompt-dialog SEEX-centered' style='position:fixed; display:none;'> \
              <span class='SEEX-closeDialog'>x</span>\
              <h2>Insert link</h2>\
              <div class='addURL'>\
                  <div class='addOwnUrl-container'>Enter URL:\
                      <input class='ownURL' type='url' value='http://' />\
                      <input class='go' id='ownGo' type='button' value='insert' />\
                  </div>\
                  <br>\
                  <hr class='or'>\
                  <div class='DDG-container'>\
                      <div id='DDG-suggestion'>\
                          <div class='DDG-go'>\
                              <input class='go' id='suggestGo' type='button' value='insert' />\
                          </div>\
                          <div id='DDG-header'></div>\
                          <div id='DDG-text'></div>\
                      </div>\
                      <br>\
                      <div class='DDG-credit'><a href='http://google.com'>Results from DuckDuckGo</a>\
                      </div>\
                 </div>\
              </div>\
          </div>";
        $('body').append(linkDiv);

        setTimeout(function() {
            $('#wmd-link-button > span').click(function(e) {
                $('#DDG-header').html('');
                $('#DDG-text').html('');
                $('#DDG-credit a').attr('href', 'http://google.com');
                $('#SEEX-insertLinkDialog').show(500);
                setTimeout(function () {
                    query = $(s).textrange();

                    $.getJSON("http://api.duckduckgo.com/?q=" + query.text + "&format=json&t=stackExchangeEditorPro&callback=?", function (json) {
                        $('#DDG-header').append("<a href='" + json.AbstractURL + "'>" + json.Heading + "</a>");
                        $('#DDG-text').append(json.Abstract);
                        $('.DDG-credit a').attr('href', json.AbstractURL);
                    });

                    $('#ownGo').click(function() {
                        SEEX.addLink(query, $(this).prev().val(), s);
                    });
                    $('#suggestGo').click(function() {
                        SEEX.addLink(query, $('#DDG-header a').attr('href'), s); 
                    });
                }, 1000);
                e.stopPropagation();
                e.preventDefault();
                return false;
            });
        }, 3000);
    },
    
    startInsertImages: function(s) {
        var imagesDiv = "<div id='SEEX-insertImageDialog' class='wmd-prompt-dialog SEEX-centered' style='position:fixed; display:none;'> \
              <span class='SEEX-closeDialog'>x</span>\
              <h2>Insert image</h2>\
              <div class='addImage'>\
                  <div class='addOwnImage-container'>Select file:\
                      <input class='ownImage' type='file' />\
                      <input class='go' id='ownGoImage' type='button' value='insert' />\
                      <label class='SEEX-asLinkContainer'><input type='checkbox' id='SEEX-imageAsLink'>Insert smaller image with link to bigger?</label>\
                  </div>\
                  <br>\
                  <hr class='or'>\
                  <div class='addLinkImage-container'>Enter URL:\
                      <input class='URLImage' type='url' value='http://' />\
                      <input class='go' id='goImage' type='button' value='insert' />\
                      <label class='SEEX-asLinkContainer'><input type='checkbox' id='SEEX-imageAsLink'>Insert smaller image with link to bigger?</label>\
                  </div>\
              </div>\
          </div>";
        $('body').append(imagesDiv);

        setTimeout(function() {
            $('#wmd-image-button > span').click(function(e) {
                $('#SEEX-insertImageDialog').show(500);
                setTimeout(function () {
                    query = $(s).textrange();

                    $('#ownGoImage').click(function() {
                        $check = $(this).next();
                        SEEX.uploadToImgur('file', $(this).prev(), function(url) {
                            SEEX.addImageLink(query, url, $check, s);
                        });
                    });
                    $('#goImage').click(function() {
                        $check = $(this).next();
                        SEEX.uploadToImgur('url', $(this).prev(), function(url) {
                            SEEX.addImageLink(query, url, $check, s);                     
                        });
                    });
                }, 1000);
                e.stopPropagation();
                e.preventDefault();
                return false;
            });
        }, 3000);
    },
    
    betterTabKey: function(s) {
        $(s).on('keydown', function(e) {
            if(e.keyCode == 9) {
                pos = $(s).textrange('get', 'position');
                oldVal = $(s).val();

                //http://stackoverflow.com/a/15977052/3541881:
                $(s).val(oldVal.substring(0, pos) + '\t' + oldVal.substring(pos));

                return false;
                e.preventDefault();
            }
        });
    },
    
    findReplace: function(s) {
        $(s).prev().after("<div class='SEEX-toolbar findReplace'><input id='find' type='text' placeholder='Find'><input id='modifier' type='text' placeholder='Modifier'><input id='replace' type='text' placeholder='Replace with'><input id='replaceGo' type='button' value='Go'></div>");
        $(document).on('click', '.findReplace #replaceGo', function() {
            regex = new RegExp($('.findReplace #find').val(), $('.findReplace #modifier').val());
            oldval = $(s).val();
            newval = oldval.replace(regex, $('.findReplace #replace').val());
            $(s).val(newval);
            SEEX.refreshPreview();
        });
    },
    
    autoCorrect: function(s) {
        var oldVal = $(s).val();
        var newVal = oldVal.replace(/\bi\b/g, "I") //capitalise 'I'
        .replace(/\.\.\.*/gi, "...") //truncate elipses
        .replace(/(?!\.\.\.*)([,.!?;:])(\S)/g, "$1 $2") //add space after punctuation
        .replace(/\s(\?|!)/g, "$1") //remove space before !/?
        .replace(/\bwud\b/gi, "would") //wud->would
        .replace(/\bcant\b/gi, "can't") //cant->can't
        .replace(/\bcud\b/gi, "could") //cud->could
        .replace(/\bwont\b/gi, "won't") //wont->won't
        .replace(/\bshud\b/gi, "should") //shud->should
        .replace(/\b(plz|pls)\b/gi, "please") //plz/pls->please
        .replace(/\bim\b/gi, "I'm") //im->I'm
        .replace(/\bu\b/gi, "you") //u->you
        .replace(/\bure?\b/gi, "your") //ur(e)->your
        .replace(/(^.)/gm,  function (txt) { //Capitalise new line first character
            return txt.toUpperCase();
        })
        .replace(/.+?[\.\?\!](\s|$)/g,  function (txt) { //Fix capitalisation. http://stackoverflow.com/a/20442069/3541881
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
        $(s).val(newVal);
        
        SEEX.refreshPreview();
    }, 
    
    addLink: function(query, url, s) {
        $(s).textrange('replace', '['+query.text+']('+url+')');
        $('#SEEX-insertLinkDialog').hide();
        SEEX.refreshPreview();
    },
    
    addKbd: function(s) {
        origText = $(s).textrange();
        $(s).textrange('replace', '<kbd>'+origText.text+'</kbd>');
        SEEX.refreshPreview();
    },
    
    startSBS: function() {
        $('#sidebar').hide();    
        $("#content").width(1360);
        $("[id^='post-editor']").removeClass("post-editor");  
        $("[id^='post-editor']").width(1360);  
        $(".community-option").css("float","right");  
        $(".wmd-container").css("float","right");  
        $(".wmd-preview").css({"clear":"none","margin-left":"20px","float":"left"});  
        $('.wmd-button-bar').css('float', 'none');
        $('.SEEX-toolbar').css('display', 'block');

        if($(location).attr('href').indexOf('/questions/ask') > -1 ) { //extra CSS for 'ask' page
            $('.wmd-preview').css('margin-top', '20px');
            $('#tag-suggestions').parent().prependTo('.form-submit.cbt');
        }              
    },
    
    keyboardShortcuts: function(s) {
        $(s).bind('keydown', 'alt+k', function() { //kbd
            SEEX.addKbd();
        });
        $(s).bind('keydown', 'alt+a', function() { //ace editor
            $('#SEEX-aceEditor').show(500);
        });
        $(s).bind('keydown', 'alt+f', function() { //find replace
            $('#findReplace').trigger('click');
        });
        
        //Replace default SE bindings
        $(document).keydown(function(e) {
            if(e.which == 71 && e.ctrlKey) { //alt+g (images)
                $('#SEEX-insertImageDialog').show(500);
                e.stopPropagation();
                e.preventDefault();
                return false;
            }
            if(e.which == 76 && e.ctrlKey) { //alt+l (links)
                $('#SEEX-insertLinkDialog').show(500);
                e.stopPropagation();
                e.preventDefault();
                return false;                
            }
        });        
    },
    
    uploadToImgur: function(type, $fileData, callback) {
        var formData = new FormData(),
            data = '';
        if (type=='file') {
            formData.append("image", $fileData[0].files[0]);
        } else {
            data = $fileData.val();
        }

        $.ajax({
            url: "https://api.imgur.com/3/image",
            type: "POST",
            headers: {
                'Authorization': 'Client-ID 1ebf24e58286774'
            },
            data: (type=='file' ? formData : data),
            success: function(response) {
                callback(response.data.link);
            },
            processData: false,
            contentType: false
        });   

    },

    addImageLink: function(query, url, $check, s) {
        if($check.find('input').is(':checked')) {
            urlsplit = url.split('/')[3].split('.');
            urlToUse = 'http://i.imgur.com/'+urlsplit[0]+'m.'+urlsplit[1];
            $(s).textrange('replace', '[!['+query.text+']('+urlToUse+')]('+url+')\n\n<sub>click image for larger variant</sub>');
        } else {
            $(s).textrange('replace', '!['+query.text+']('+url+')');
        }
        $('#SEEX-insertImageDialog').hide();
        SEEX.refreshPreview();
    },
    
    refreshPreview: function() {
        StackExchange.MarkdownEditor.refreshAllPreviews();
    }
};

setTimeout(function() {
    $.each($('[id^="wmd-input"]'), function() {
        SEEX.init($(this).attr('id'));
    });

    $('.edit-post').click(function() {
        $that = $(this);
        setTimeout(function() {
            SEEX.init($that.parents('table').next().find('[id*="wmd-input"]').attr('id'));
        }, 2000);
    });
}, 2000);
