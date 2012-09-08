//Copyright Joyent, Inc. and other Node contributors.

//Permission is hereby granted, free of charge, to any person obtaining a
//copy of this software and associated documentation files (the
//"Software"), to deal in the Software without restriction, including
//without limitation the rights to use, copy, modify, merge, publish,
//distribute, sublicense, and/or sell copies of the Software, and to permit
//persons to whom the Software is furnished to do so, subject to the
//following conditions:

//The above copyright notice and this permission notice shall be included
//in all copies or substantial portions of the Software.

//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
//MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
//NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
//DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
//OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
//USE OR OTHER DEALINGS IN THE SOFTWARE.

// Modifications Copyright 2011-2012 Appcelerator, Inc.

var TAG = "EventEmitter";
var EventEmitter = exports.EventEmitter = kroll.EventEmitter;
var isArray = Array.isArray;

//By default EventEmitters will print a warning if more than
//10 listeners are added to it. This is a useful default which
//helps finding memory leaks.

Object.defineProperty(EventEmitter.prototype, "callHandler", {
	value: function(handler, type, data) {
		//kroll.log(TAG, "calling event handler: type:" + type + ", data: " + data + ", handler: " + handler);
		if (!handler.listener || !(handler.listener.call)) {
			if (kroll.DBG) {
				kroll.log(TAG, "handler for event '" + type + "' is " + (typeof handler.listener) + " and cannot be called.");
			}
			return;
		}

		// Create event object, copy any custom event data,
		// and setting the "type" and "source" properties.
		var event = { type: type, source: this };
		if (Object.prototype.toString.call(data) === "[object Object]") {
			kroll.extend(event, data);
		}

		if (handler.self && (event.source == handler.self.view)) {
			event.source = handler.self;
		}
		handler.listener.call(this, event);
	},
	enumerable: false
});

Object.defineProperty(EventEmitter.prototype, "emit", {
	value: function(type) {

		// If there is no 'error' event listener then throw.
		/*if (type === 'error') {
			if (!this._events || !this._events.error ||
					(isArray(this._events.error) && !this._events.error.length))
			{
				if (arguments[1] instanceof Error) {
					throw arguments[1]; // Unhandled 'error' event
				} else {
					throw new Error("Uncaught, unspecified 'error' event.");
				}
				return false;
			}
		}*/

		if (this._hasJavaListener) {
			this._onEventFired( type,  arguments[1] || {});
		}

		if (!this._events) {
			//kroll.log(TAG, "no events for " + type + ", not emitting");
			return false;
		}

		var handler = this._events[type];
		if (!handler) {
			//kroll.log(TAG, "no handler for " + type + ", not emitting");
			return false;
		}

		if (!this.callHandler) {
			if (kroll.DBG) {
				kroll.log(TAG, "callHandler function not available for " + type);
			}
			return false;
		}

		if (typeof handler.listener == 'function') {
			switch (arguments.length) {
			case 1:
				this.callHandler(handler, type);
				break;
			default:
				this.callHandler(handler, type, arguments[1]);
				break;
			}
			return true;

		} else if (isArray(handler)) {
			var args = Array.prototype.slice.call(arguments, 1);
			var listeners = handler.slice();

			for (var i = 0, l = listeners.length; i < l; i++) {
				this.callHandler(listeners[i], type, args[0]);
			}
			return true;

		} else {
			return false;
		}
	},
	enumerable: false
});

// Titanium compatibility
Object.defineProperty(EventEmitter.prototype, "fireEvent", {
	value: EventEmitter.prototype.emit,
	enumerable: false,
	writable: true
});

Object.defineProperty(EventEmitter.prototype, "fireSyncEvent", {
	value: EventEmitter.prototype.emit,
	enumerable: false
});

//EventEmitter is defined in src/node_events.cc
//EventEmitter.prototype.emit() is also defined there.
Object.defineProperty(EventEmitter.prototype, "addListener", {
	value: function(type, listener, view) {
		if ('function' !== typeof listener) {
			throw new Error('addListener only takes instances of Function. The listener for event "' + type + '" is "' + (typeof listener) + '"');
		}

		if (!this._events) {
			this._events = {};
		}

		var id;

		// Setup ID first so we can pass count in to "listenerAdded"
		if (!this._events[type]) {
			id = 0;
		} else if (isArray(this._events[type])) {
			id = this._events[type].length;
		} else {
			id = 1;
		}

		var listenerWrapper = {};
		listenerWrapper.listener = listener;
		listenerWrapper.self = view;

		if (!this._events[type]) {
			// Optimize the case of one listener. Don't need the extra array object.
			this._events[type] = listenerWrapper;
		} else if (isArray(this._events[type])) {
			// If we've already got an array, just append.
			this._events[type].push(listenerWrapper);
		} else {
			// Adding the second element, need to change to array.
			this._events[type] = [this._events[type], listenerWrapper];
		}

		// Notify the Java proxy if this is the first listener added.
		if (id == 0) {
			this._hasListenersForEventType(type, true);
		}

		return id;
	},
	enumerable: false
});


// The JavaObject prototype will provide a version of this
// that delegates back to the Java proxy. Non-Java versions
// of EventEmitter don't care, so this no op is called instead.
Object.defineProperty(EventEmitter.prototype, "_listenerForEvent", {
	value: function () {},
	enumerable: false
});

Object.defineProperty(EventEmitter.prototype, "on", {
	value: EventEmitter.prototype.addListener,
	enumerable: false
});

// Titanium compatibility
Object.defineProperty(EventEmitter.prototype, "addEventListener", {
	value: EventEmitter.prototype.addListener,
	enumerable: false,
	writable: true
});

Object.defineProperty(EventEmitter.prototype, "once", {
	value: function(type, listener) {
		var self = this;
		function g() {
			self.removeListener(type, g);
			listener.apply(this, arguments);
		};

		g.listener = listener;
		self.on(type, g);

		return this;
	},
	enumerable: false
});

Object.defineProperty(EventEmitter.prototype, "removeListener", {
	value: function(type, listener) {
		if ('function' !== typeof listener) {
			throw new Error('removeListener only takes instances of Function');
		}

		// does not use listeners(), so no side effect of creating _events[type]
		if (!this._events || !this._events[type]) return this;

		var list = this._events[type];
		var count = 0;
		
		if (isArray(list)) {
			var position = -1;
			// Also support listener indexes / ids
			if (typeof listener === 'number') {
				position = listener;
				if (position > list.length || position < 0) {
					return this;
				}
			} else {
				for (var i = 0, length = list.length; i < length; i++) {
					if (list[i].listener === listener)
					{
						position = i;
						break;
					}
				}
			}

			if (position < 0) {
				return this;
			}
			
			list.splice(position, 1);
			
			if (list.length == 0) {
				delete this._events[type];
			}
			
			count = list.length;
			
		} else if (list.listener === listener || listener == 0) {
			delete this._events[type];
			
		} else {
			return this;
		}
		
		if (count == 0) {
			this._hasListenersForEventType(type, false);
		}

		return this;
	},
	enumerable: false
});

Object.defineProperty(EventEmitter.prototype, "removeEventListener", {
	value: EventEmitter.prototype.removeListener,
	enumerable: false,
	writable: true
});

Object.defineProperty(EventEmitter.prototype, "removeAllListeners", {
	value: function(type) {
		// does not use listeners(), so no side effect of creating _events[type]
		if (type && this._events && this._events[type]) {
			this._events[type] = null;
			this._hasListenersForEventType(type, false);
		}
		return this;
	},
	enumerable: false
});

Object.defineProperty(EventEmitter.prototype, "listeners", {
	value: function(type) {
		if (!this._events) this._events = {};
		if (!this._events[type]) this._events[type] = [];
		if (!isArray(this._events[type])) {
			this._events[type] = [this._events[type]];
		}
		return this._events[type];
	},
	enumerable: false
});

