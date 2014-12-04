jQuery simpleFilter
---

This is a simple jQuery plug-in that filters an array of strings by some input. To
use the plug-in, call the simpleFilter function on a text
input (or anything with a value that can have a 'keyup'
event triggered on it) and provide the source for the data.
This plug-in will match results in the data and display them
in a list directly below the input. Clicking on an option
in the list inserts that content into the input and hides
the list (there are also keyboard controls).


**Requirements**

* jQuery 1.2+ (* see below)
* jquery.quicksilver (simple port to jQuery-style plug-in, included in this repo)


**Features**

* Use simple JSON array for data source
* Dynamic filter list appears when needed, hides when not
* Can use Quicksilver or traditional autocomplete-style matching
* Keyboard navigation within filtered list (up, down, enter, escape)
* Click an option in filtered list to auto-populate input
* Sort result list by score, alpha, or original order
* Accessibility attributes applied where necessary

**Options**

```js
{
    data: [],              // Array REQUIRED Simple list of strings that represent an option in the filter list
    maxListEntries: null,  // Number If provided, result filter list will only contain up to this many entries
    caseSensitive: false,  // Boolean If true, must match case as well as text value
    useQuicksilver: true,  // Boolean Quicksilver matches entries by scoring characters, if set to false, simpleFilter will use a straight first-to-last character matching (in order) instead
    showAll: false,        // Boolean If true, when the input has focus and the up or down keys are pressed, all options are shown
    position: 0,           // Int (index) Where to place list (variable, above, below); see $.fn.simpleFilter.position above for options
    sortBy: 0,             // Int (index) How to sort results (none, score, alpha); see $.fn.simpleFilter.sortBy above for options
    waitTime: 150,         // Int Milliseconds to wait after key up before filtering
    postFilter: null       // Function Callback function - called after every filtering
}
```

**Basic Usage**

```html
<p>US State: <input type='text' id='state' /></p>
```

```js
var states = ['Alabama',
  'Alaska',
  'Arizona',
  ...
  'Wisconsin',
  'Wyoming'
];

$('#state').simpleFilter({
  data: states
});
```

There are [more examples](http://jordankasper.com/jquery/filter) on my personal site.

**Tested Browsers**

* Firefox 3+
* Internet Explorer 6+
* Chrome
* Opera


**Notes**

Note that not all browsers have had every feature tested.
This plug-in is still an early version, although relatively
stable (I think). Please be sure to read the disclaimer
and lack-of-warranty clause at the top of the code.

Using jQuery 1.2 may cause filtered lists to appear
above or below the input incorrectly depending on many
factors. Upgrading to jQuery 1.2.3 or higher fixes these
issues.