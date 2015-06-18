



/**
 * jQuery iframe click tracking plugin by Vicente Paré used for A/B-Testing an iframe with optimizely
 *
 * @author Vincent Paré (www.finalclap.com)
 * @copyright © 2013-2015 Vincent Paré
 * @licence http://opensource.org/licenses/Apache-2.0
 * @version 1.0.5
 */

jQuery.noConflict();
//iframe-Click-Tracker 

(function(jQuery){
	// Tracking handler manager
	jQuery.fn.iframeTracker = function(handler){
		var target = this.get();
		if (handler === null || handler === false) {
			jQuery.iframeTracker.untrack(target);
		} else if (typeof handler == "object") {
			jQuery.iframeTracker.track(target, handler);
		} else {
			throw new Error("Wrong handler type (must be an object, or null|false to untrack)");
		}
	};
	
	// Iframe tracker common object
	jQuery.iframeTracker = {
		// State
		focusRetriever: null,  // Element used for restoring focus on window (element)
		focusRetrieved: false, // Says if the focus was retrived on the current page (bool)
		handlersList: [],      // Store a list of every trakers (created by calling jQuery(selector).iframeTracker...)
		isIE8AndOlder: false,  // true for Internet Explorer 8 and older
		
		// Init (called once on document ready)
		init: function(){
			// Determine browser version (IE8-) (jQuery.browser.msie is deprecated since jQuery 1.9)
			try {
				if (jQuery.browser.msie == true && jQuery.browser.version < 9) {
					this.isIE8AndOlder = true;
				}
			} catch(ex) {
				try {
					var matches = navigator.userAgent.match(/(msie) ([\w.]+)/i);
					if (matches[2] < 9) {
						this.isIE8AndOlder = true;
					}
				} catch(ex2) {}
			}
			
			// Listening window blur
			jQuery(window).focus();
			jQuery(window).blur(function(e){
				jQuery.iframeTracker.windowLoseFocus(e);
			});
			
			// Focus retriever (get the focus back to the page, on mouse move)
			jQuery('body').append('<div style="position:fixed; top:0; left:0; overflow:hidden;"><input style="position:absolute; left:-300px;" type="text" value="" id="focus_retriever" readonly="true" /></div>');
			this.focusRetriever = jQuery('#focus_retriever');
			this.focusRetrieved = false;
			jQuery(document).mousemove(function(e){
				if (document.activeElement && document.activeElement.tagName == 'IFRAME') {
					jQuery.iframeTracker.focusRetriever.focus();
					jQuery.iframeTracker.focusRetrieved = true;
				}
			});
			
			// Special processing to make it work with my old friend IE8 (and older) ;)
			if (this.isIE8AndOlder) {
				// Blur doesn't works correctly on IE8-, so we need to trigger it manually
				this.focusRetriever.blur(function(e){
					e.stopPropagation();
					e.preventDefault();
					jQuery.iframeTracker.windowLoseFocus(e);
				});
				
				// Keep focus on window (fix bug IE8-, focusable elements)
				jQuery('body').click(function(e){ jQuery(window).focus(); });
				jQuery('form').click(function(e){ e.stopPropagation(); });
				
				// Same thing for "post-DOMready" created forms (issue #6)
				try {
					jQuery('body').on('click', 'form', function(e){ e.stopPropagation(); });
				} catch(ex) {
					console.log("[iframeTracker] Please update jQuery to 1.7 or newer. (exception: " + ex.message + ")");
				}
			}
		},
		
		
		// Add tracker to target using handler (bind boundary listener + register handler)
		// target: Array of target elements (native DOM elements)
		// handler: User handler object
		track: function(target, handler){
			// Adding target elements references into handler
			handler.target = target;
			
			// Storing the new handler into handler list
			jQuery.iframeTracker.handlersList.push(handler);
			
			// Binding boundary listener
			jQuery(target)
				.bind('mouseover', {handler: handler}, jQuery.iframeTracker.mouseoverListener)
				.bind('mouseout',  {handler: handler}, jQuery.iframeTracker.mouseoutListener);
		},
		
		// Remove tracking on target elements
		// target: Array of target elements (native DOM elements)
		untrack: function(target){
			if (typeof Array.prototype.filter != "function") {
				console.log("Your browser doesn't support Array filter, untrack disabled");
				return;
			}
			
			// Unbinding boundary listener
			jQuery(target).each(function(index){
				jQuery(this)
					.unbind('mouseover', jQuery.iframeTracker.mouseoverListener)
					.unbind('mouseout', jQuery.iframeTracker.mouseoutListener);
			});
			
			// Handler garbage collector
			var nullFilter = function(value){
				return value === null ? false : true;
			};
			for (var i in this.handlersList) {
				// Prune target
				for (var j in this.handlersList[i].target) {
					if (jQuery.inArray(this.handlersList[i].target[j], target) !== -1) {
						this.handlersList[i].target[j] = null;
					}
				}
				this.handlersList[i].target = this.handlersList[i].target.filter(nullFilter);
				
				// Delete handler if unused
				if (this.handlersList[i].target.length == 0) {
					this.handlersList[i] = null;
				}
			}
			this.handlersList = this.handlersList.filter(nullFilter);
		},
		
		// Target mouseover event listener
		mouseoverListener: function(e){
			e.data.handler.over = true;
			try {e.data.handler.overCallback(this);} catch(ex) {}
		},
		
		// Target mouseout event listener
		mouseoutListener: function(e){
			e.data.handler.over = false;
			jQuery.iframeTracker.focusRetriever.focus();
			try {e.data.handler.outCallback(this);} catch(ex) {}
		},
		
		// Calls blurCallback for every handler with over=true on window blur
		windowLoseFocus: function(event){
			for (var i in this.handlersList) {
				if (this.handlersList[i].over == true) {
					try {this.handlersList[i].blurCallback();} catch(ex) {}
				}
			}
		}
	};
	
	// Init the iframeTracker on document ready
	jQuery(document).ready(function(){
		jQuery.iframeTracker.init();
	});
})(jQuery);


//Optimizely Click handler


jQuery(".quiz").replaceWith(
	'<div class="new_quiz"><iframe width="320" frameborder="0" height="500" style="height: 500px; width:320px; border:0 none;" src="http://quiz.zeit.de/#/quiz/45/" ></iframe></div>'
	);

window['optimizely'] = window['optimizely'] || [];

// sends a tracking call to Optimizely for the given event name. 

jQuery(document).ready(function(jQuery){
    jQuery('.new_quiz iframe').iframeTracker({
        blurCallback: function(){
            window.optimizely.push(["trackEvent", "new_quiz"]);
            console.log("clicked");
            jQuery('.new_quiz iframe').iframeTracker(false);
        }
    });
});

//$(editFrame).contents().find("html").html();

