/* Copyright (c) 2008 Jordan Kasper
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * Copyright notice and license must remain intact for legal use
 * Requires: jQuery 1.2+
 *           jQuery.quicksilver
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF 
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS 
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN 
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN 
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * 
 * Fore more usage documentation and examples, visit:
 *          http://jkdesign.org/filter/
 * 
 * Basic usage:
    <input type='text' id='someInput' />
    
    $('#someInput').simpleFilter({
      data: ['one', 'two', ...],  // Array REQUIRED
      maxListEntries: 10,         // Number If provided, result filter list will only contain up to this many entries
      caseSensitive: false,       // Boolean If true, must match case as well as text value
      useQuicksilver: true,       // Boolean Quicksilver matches entries by scoring characters, if set to false, simpleFilter will use a straight first-to-last character matching (in order) instead
      showAll: false,             // Boolean If true, when the input has focus and the up or down keys are pressed, all options are shown
      position: 0,                // Int (index) Where to place list (variable, above, below); see $.simpleFilterData.positions at the end of this file for options
      sortBy: 0,                  // Int (index) How to sort results (none, score, alpha); see $.simpleFilterData.sortBy at the end of this file for options
      waitTime: 150,              // Int Milliseconds to wait after key up before filtering
      postFilter: null            // Function Callback function - called after every filtering
    });
 * 
 * If you want to know when a selection is made, bind to 
 * "input.simpleFilter" on the input:
   
    $('#someInput').bind('input.simpleFilter', function(jQEvent, text) {
      if (typeof(text) != 'undefined') {
        // handle it
      }
      // NOTE: this binding will also capture regular 'input' events,  
      // you will want to check the text argument. If it is undefined, 
      // then you do NOT process the event as a simpleFilter selection
    });
 * 
 * 
 * TODO:
 *   write testing suite
 * 
 * REVISIONS
 *   0.5 Initial release to jQuery Plug-in site
 *   0.6 Fixes to make compatible with jQuery 1.2, FF3 bugs
 *   0.7 Fixed sorting,
 *       Removed postRender callback option (wasn't really working),
 *       Changed waitTime to start filtering after X ms, even if they are still typing,
 *       Add "escape" key handler for hiding list
 *       Force list above input if at bottom of viewport
 *       Add option to always show list above (or below), regardless of viewport size & input position
 *       Added event on input when filter option is selected (input.simpleFilter)
 *   0.8 Fixed type checking on various options
 *       Added 'showAll' option to show all items in list when no input is given on up/down key
 *       Added accessibility attributes to list and options (ARIA)
 *       Fixed issue in IE with non-Quicksilver scoring
 *       Fixed some issues with positioning fitlered list above input
 *   0.9 Fixed issue with jQuery chain being broken
 *       Hiding list options versus removing/readding for efficiency
 *       Reorganized code to not pollute jQuery namespace and privatize some helpers
 *       Added static vars for position and sorting options
 *       Fixed issue with click binding not firing some times
 */
;(function($) {
  
  // ----------- Public methods ----------- //
  
  $.fn.simpleFilter = function(options) {
    var n = this;
    if (n.length < 1) { return n; }
    
    // Set up options and cache filter instance for removal later
    options = (options)?options:{};
    $.simpleFilterData.instances[n.attr('id')] = {
      input: this,
      itemFocus: 0
    };
    $.simpleFilterData.instances.count++;
    var self = $.simpleFilterData.instances[n.attr('id')];
    
    // ----------- Private Helper Methods ----------- //
    
    var auditOptions = function(options) {
      if (!options.data || !options.data.length || typeof(options.data) != "object") { options.data = $.simpleFilterData.defaults.data; }
      if (!options.maxListEntries || typeof options.maxListEntries != 'number' || options.maxListEntries < 0) { options.maxListEntries = $.simpleFilterData.defaults.maxListEntries; }
      if (typeof(options.caseSensitive) != 'boolean') { options.caseSensitive = $.simpleFilterData.defaults.caseSensitive; }
      if (typeof(options.useQuicksilver) != 'boolean') { options.useQuicksilver = $.simpleFilterData.defaults.useQuicksilver; }
      if (typeof(options.showAll) != 'boolean') { options.showAll = $.simpleFilterData.defaults.showAll; }
      if (typeof(options.position) != 'number' || options.position < 0 || options.position >= $.simpleFilterData.positions.length) { options.position = $.simpleFilterData.defaults.position; }
      if (typeof(options.sortBy) != 'number' || options.sortBy < 0 || options.sortBy >= $.simpleFilterData.sortBy.length) { options.sortBy = $.simpleFilterData.defaults.sortBy; }
      if (typeof(options.waitTime) != 'number' || typeof options.waitTime != 'number' || options.waitTime < 0) { options.waitTime = $.simpleFilterData.defaults.waitTime; }
      return options;
    }
    
    var repositionList = function() {
      var l = $(self.list);
      if (!n || n.length < 1) { return; }
      var pos = n.offset();
      var t = pos.top + n.height() + 5;
      var placeAbove = false;
      var vh  = (window.innerHeight)?window.innerHeight:$(window).height();
      var st = (document.documentElement.scrollTop)?document.documentElement.scrollTop:document.body.scrollTop;
      //alert('vh='+vh+'; t='+t+'; st='+st+'; l.h()='+l.height()+'; p.t='+pos.top);
      if ($.simpleFilterData.positions[self.options.position] == 'above' ||
          ($.simpleFilterData.positions[self.options.position] != 'below' &&
           ((t - st) + l.height()) > vh && 
           ((pos.top - st) - l.height()) > 0)) {
        placeAbove = true;
        if ($.browser && $.browser.msie && $.browser.version < 7) {
          var b = $(document).height() - (pos.top + 2);
        } else {
          var b = vh - (pos.top + 1);
        }
      }
      l.css({
        left: pos.left,
        width: n.width() + 2  // border
      });
      if (placeAbove) {
        //alert('vh='+vh+'; pos.top='+pos.top+'; b='+b+'; l.css(top)='+l.css('top')+'; l.css(bot)='+l.css('bottom'));
        l.css({'bottom': b+'px', 'top': 'auto'});
      } else {
        l.css({'bottom': 'auto', 'top': t});
      }
    }
    
    var handleKeyControl = function(key) {
      if (key == 38) {
        self.itemFocus--;
        if (self.itemFocus < 1) {
          self.itemFocus = $(self.list).children('li:visible').length;
        }
        
      } else if (key == 40) {
        self.itemFocus++;
        if (self.itemFocus > $(self.list).children('li:visible').length) {
          self.itemFocus = 1;
        }
        
      } else if (key == 13) {
        if (self.itemFocus > 0) {
          var item = $(self.list).children('li:visible:eq('+(self.itemFocus-1)+')');
          handleSelect(item.get(0));
          return true;
        }
      }
      $(self.list).children('li').removeClass('activeFilterOption').attr('aria-selected', 'false');
      $(self.list).children('li:visible:eq('+(self.itemFocus-1)+')').addClass('activeFilterOption').attr('aria-selected', 'true');
    }
    
    var score = function(text, input) {
      for (var i=0; i<input.length; ++i) {
        if (input.substr(i,1) != text.substr(i,1)) { return 0; }
      }
      return ( input.length / text.length );
    }
    
    function showItem(itemNode) {
      l.append(itemNode);
      $(itemNode).show().attr('aria-hidden', 'false');
    }
    function hideItem(itemNode) {
      itemNode
        .hide()
        .attr('aria-hidden', 'true');
    }
    
    function showList() {
      l.show().attr('aria-hidden', 'false');
    }
    
    function hideList() {
      l.add(l.find('li'))
        .hide()
        .attr('aria-hidden', 'true');
      self.itemFocus = 0;
    }
    
    function showAll() {
      showList();
      $.each(self.cache, function() {
        showItem(this[1]);
      });
      repositionList();
    }
    
    function handleInput() {
      if (self.waitHandle === null) {
        self.waitHandle = setTimeout(function() {
          self.waitHandle = null;
          doFilter();
        }, self.options.waitTime);
      }
    }
    
    function handleSelect(itemNode) {
      if (itemNode) {
        self.input
          .val(itemNode.innerHTML)
          .trigger('input.simpleFilter', [itemNode.innerHTML]);
        hideList();
        self.input.focus();
      }
    }
    
    
    // ------------- SimpleFilter Setup ------------- //
    
    // add binding to reposition all filter lists on window resize
    // only do this on the first instance (its the same for all)
    if ($.simpleFilterData.instances.count == 1) {
      $(window).bind('resize.simpleFilter', function() {
        $.each($.simpleFilterData.instances, function(key) {
          if (key != 'count') {
            repositionList();
          }
        });
      });
    }
    
    self.options = auditOptions($.extend({}, $.simpleFilterData.defaults, options));
    
    // Turn off auto complete since that's what we're implementing
    self.input.attr('autocomplete', 'off');
    
    // Cache the data to filter in the instance
    self.cache = [];
    if (self.options.data.length > 0) {
      $.each(self.options.data, function(i) {
        self.cache.push([
          ""+this,
          $('<li role="option" datatype="string">'+this+'</li>')
        ]);
      });
    } else {
      return n;
    }
    
    // create list element with some styles
    var pos = n.offset();
    self.list = $('body')
                  .append('<ul id="'+n.attr('id')+'_simpleFilterInput" class="filterList" style="display: none;" role="listbox" aria-hidden="true" aria-live="assertive" aria-relevant="additions removals"></ul>')
                  .find('ul#'+n.attr('id')+'_simpleFilterInput')
                    .css({
                      position: 'absolute',
                      //top: pos.top + n.height() + 5,
                      left: pos.left,
                      width: n.width() + 2,  // border
                      zIndex: 990
                    })
                    .get(0);
    var l = $(self.list); // just for ease of use and slight efficiency
    self.input.attr('aria-controls', n.attr('id')+'_simpleFilterInput');
    
    // Add all items to list and setup handler(s), then hide by defualt
    $.each(self.cache, function(i) {
      $(this[1])
        .hide()
        .appendTo(l)
        .click(function(e) {
          handleSelect(this);
        })
        .hover(
          function() { $(this).addClass('activeFilterOption'); },
          function() { $(this).removeClass('activeFilterOption'); }
        );
    });
    
    // Main fitler handling
    function doFilter() {
      self.waitHandle = null;
      var input = $.trim(n.val());
      if (!self.options.caseSensitive) { input = input.toLowerCase(); }
      if (input.length < 1) {
        if (!self.options.showAll) {
          hideList();
        }
      } else {
        // filter the data
        var scores = [];
        $.each(self.cache, function(i) {
          var w = this[0];
          if (!self.options.caseSensitive) { w = w.toLowerCase(); }
          if (self.options.useQuicksilver) {
            var s = $.score(w, input);
          } else {
            var s = score(w, input);
          }
          if (s > 0) {
            scores.push([s, i, this]);
          } else {
            hideItem(this[1]);
          }
        });
        
        // sort results if necessary
        if ($.simpleFilterData.sortBy[self.options.sortBy] != 'none' && scores.length > 0) {
          scores.sort(function(a, b){
            switch ($.simpleFilterData.sortBy[self.options.sortBy]) {
              case 'score':
                return b[0] - a[0];
              case 'alpha':
                if (a[2][0] > b[2][0]) { return 1; } else
                if (b[2][0] > a[2][0]) { return -1; } else
                { return 0; }
              default:
                return 0;
            }
          });
        }
        
        if ($.isFunction(self.options.postFilter)) {
          self.options.postFilter.apply(self.input, [input, scores]);
        }
        
        // show results
        if (scores.length > 0) {
          showList();
          if (self.options.maxListEntries && self.options.maxListEntries > 0) {
            scores = scores.slice(0, self.options.maxListEntries);
            var unused = scores.slice(self.options.maxListEntries);
            $.each(unused, function() {
              hideItem(this[2][1]);
            });
          }
          $.each(scores, function() {
            showItem(this[2][1]);
          });
          if (scores[0][2].toString().toLowerCase() == n.val().toLowerCase()) {
            // exact match to only entry so hide filter list
            hideList();
            return;
          }
          
          repositionList();
          
        } else {
          // no matches, hide fitler list
          hideList();
          return;
        }
      }
    }
    
    // Bind filtering to keyup
    self.waitHandle = null;
    n.bind('keyup.simpleFilter', function(e) {
      if ($.trim(self.input.val()).length < 1 && self.options.showAll && l.is(':hidden')) {
        if (e.keyCode == 40 || e.which == 40 || e.keyCode == 38 || e.which == 38) {
          showAll();
        }
      }
      // using keys to navigate filter list
      if (e.keyCode == 40 || e.which == 40) { // down
        handleKeyControl(40);
        if (l.is(':hidden')) {
          handleInput();
        }
        
      } else if (e.keyCode == 38 || e.which == 38) { // up
        handleKeyControl(38);
        if (l.is(':hidden')) {
          handleInput();
        }
        
      } else if (e.keyCode == 13 || e.which == 13) { // enter
        if (handleKeyControl(13)) {
          e.preventDefault(); // stop enter-submit if selecting list item
        }
        
      } else if (e.keyCode == 27 || e.which == 27) { // escape
        hideList();
        
      } else {
        // typing input
        handleInput();
      }
    });
    // Bind hiding to blur
    n.bind('blur.simpleFilter', function() {
      // use a timeout to allow time for click event above to trigger
      setTimeout(function() {
        if (l.is(':visible')) {
          hideList();
        }
      }, 150);
    });
    
    return n;
  };
  
  $.fn.removeSimpleFilter = function() {
      var n = this;
      if (n.length < 1) { return n; }
      n.unbind('.simpleFilter');
      if ($.simpleFilterData.instances[n.attr('id')]) {
        $($.simpleFilterData.instances[n.attr('id')].list).remove();
        $.simpleFilterData.instances[n.attr('id')] = null;
        $.simpleFilterData.instances.count --;
      }
      if ($.simpleFilterData.instances.count < 1) {
        $(window).unbind('resize.simpleFilter');
      }
      return n;
  }
  
  
  // ----------- Static properties ----------- //
  
  $.simpleFilterData = {
    instances: {count: 0},
    // statics for options
    SORT_SCORE: 0,
    SORT_ALPHA: 1,
    SORT_NONE: 2,
    POSITION_VARIABLE: 0,
    POSITION_ABOVE: 1,
    POSITION_BELOW: 2,
    sortBy: ['score', 'alpha', 'none'],
    positions: ['variable', 'above', 'below'],
    defaults: {
      data: [],              // Array REQUIRED
      maxListEntries: null,  // Number If provided, result filter list will only contain up to this many entries
      caseSensitive: false,  // Boolean If true, must match case as well as text value
      useQuicksilver: true,  // Boolean Quicksilver matches entries by scoring characters, if set to false, simpleFilter will use a straight first-to-last character matching (in order) instead
      showAll: false,        // Boolean If true, when the input has focus and the up or down keys are pressed, all options are shown
      position: 0,           // Int (index) Where to place list (variable, above, below); see $.simpleFilterData.positions above for options
      sortBy: 0,             // Int (index) How to sort results (none, score, alpha); see $.simpleFilterData.sortBy above for options
      waitTime: 150,         // Int Milliseconds to wait after key up before filtering
      postFilter: null       // Function Callback function - called after every filtering
    }
  };

})(jQuery);
