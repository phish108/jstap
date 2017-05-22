/**
 * jesta
 *
 * ES6 gesture detection
 */

/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */

// const jsConsole = document.getElementById("console");
// function log(msg) {
//   jsConsole.textContent += `${msg}\n`
// }

/**
 * register to the document to catch all touch events.
 * trigger CustomEvent() for detected gestures
 */
class Jesta {
  constructor() {
    this.opts = {
      tapDistance:    10,
      tapTime:        100, // miliseconds
      tapLongTime:    1000,// miliseconds
      doubleTapTime:  400, // miliseconds
      swipeDistance:  100,
      flickTime:      100,
      flickDistance:  50
    };

    this.lastTouchTime = 0;
    this.lastTouchCount = 0;

    // register to document
    document.addEventListener("touchstart",  e => this.touchStart(e));
    document.addEventListener("touchend",    e => this.touchEnd(e));
    document.addEventListener("touchcancel", e => this.touchCancel(e));
    document.addEventListener("touchmove",   e => this.touchMove(e));
    document.addEventListener("jesta", e => this.changeOpts(e.detail));
}

/**
 * in order to change the default values of Jesta, an app has to send the
 * jesta event to the document using a CustomEvent. The option values are
 * stored in the event's detail attribute.
 *
 * The defaults are:
 * - tapDistance = 10 (px) maximum distance for getting regonised as a tap
 * - tapTime = 100 (ms) maximum time for having the finger on the display
 * - tapLongTime = 1000 (ms) Min Time for getting recognised as press.
 * - doubleTapTime = 400 (ms) max time for repeated events.
 * - swipeDistance = 100 (px) min distance of finger movement for swipe and flicks.
 * - flickTime = 100 (ms) max time for flick events
 * - flickDistance = 50 (px) min distance to move for flicks.
 */
  changeOpts(opts) {
      if (typeof opts === "object") {
          Object.keys(this.opts).map(o => this.opts[o] = parseInt(opts[o]) || this.opts[o]);
      }
  }

  touchStart(event) {
      if (!this.android && !this.ios) {
        this.android = (!event.scale && event.scale !== 0);
        this.ios = (!this.android);
      }

      this.evOpts = {
        detail: {
          'scale': 0.0,
        },
        'bubbles': true,
        'cancelable': true
      };

      this.startTime = new Date().getTime();
      this.identifier = [];
      this.xTouches = {
        "start": [],
        "delta": [],
        "total": [],
        "prev": []
      };
      this.yTouches =  {
        "start": [],
        "delta": [],
        "total": [],
        "prev": []
      };

      this.deltaScale = 1.0;
      this.totalScale = 1.0;
      this.tapped = false;

    this.addTouch(event);
  }

  touchMove(event) {
    if (this.android) {
        event.preventDefault();
    }

    this.updateTouches(event);

    this.evOpts.detail.scale = this.deltaScale;
    this.evOpts.detail.touches = event.touches;
    this.evOpts.detail.count = this.identifier.length;
    this.opts.targetTouches = event.targetTouches;
    this.opts.changedTouches = event.changedTouches;

    if (this.evOpts.detail.rotation) {
        event.preventDefault();
        document.getElementById('console').textContent += this.evOpts.detail.rotation + "\n";
        this.dispatchEvent(this.target, "rotate");
    }
    else if (this.deltaScale > 1.0) {
      this.dispatchEvent(this.target, "widen");
    }
    else if (this.deltaScale < 1.0) {
      this.dispatchEvent(this.target, "narrow");
    }

    this.dispatchEvent(this.target, "move");
  }

  touchEnd(event) {
    this.endTime = new Date().getTime();

    this.evOpts.detail.duration = this.endTime - this.startTime;
    this.evOpts.detail.scale = this.totalScale;
    this.evOpts.detail.count = this.identifier.length;

    this.detectTap();
    this.detectSwipeOrFlick();
    this.detectPinchOrStretch();
    this.removeTouch(event);
  }

  touchCancel(event) {
    // everything ends here
    this.yTouches = {};
    this.xTouches = {};
    this.identifier = [];
  }

  detectTap() {
    let ev = "tap";
    let dt = this.evOpts.detail.duration;

    if (Math.max(...this.xTouches.total) <= this.opts.tapDistance &&
        Math.max(...this.yTouches.total) <= this.opts.tapDistance) {

      let dtTap = this.endTime - this.lastTouchTime;
      let dtLimit = this.opts.doubleTapTime;

      if (dt >= this.opts.tapLongTime) {
        ev = "press";
        dtLimit += this.opts.tapLongTime;
      }

      if (dtTap <= dtLimit) {
        this.lastTouchCount += 1;
      }
      else {
        this.lastTouchCount = 0;
      }

      // double or multi taps can be discovered by checking the repeat value.
      this.evOpts.detail.repeat = this.lastTouchCount;
      this.lastTouchEvent = ev;
      this.lastTouchTime = this.endTime;
      this.tapped = true;

      this.dispatchEvent(this.target, ev);
    }
  }

  detectSwipeOrFlick() {
    if (!this.tapped &&
        Math.max(...this.xTouches.total) >= this.opts.flickDistance ||
        Math.max(...this.yTouches.total) >= this.opts.flickDistance) {
          this.evOpts.detail.distance = {
            "x": Math.max(...this.xTouches.total),
            "y": Math.max(...this.yTouches.total)
          };
          this.tapped = true;
          if (this.duration < this.opts.flickTime) {
            this.dispatchEvent(this.target, "flick");
            this.dispatchEvent(this.target, "fling"); // google ...
          }
          else {
            this.dispatchEvent(this.target, "swipe");
          }
    }
  }

  detectPinchOrStretch() {
    if (!this.tapped) {
      let ev;
      if (this.evOpts.detail.scale > 1.2) {
        ev = this.evOpts.detail.count === 2 ? "stretch" : "spread";
      }
      else if (this.evOpts.detail.scale < 0.8) {
        ev = this.evOpts.detail.count === 2 ? "pinch" : "grab";
      }
      if (ev) {
        this.tapped = true;
        this.dispatchEvent(this.target, ev);
      }
    }
  }

  addTouch(event) {
    let i;
    for (i = 0; i < event.touches.length; i++) {
      if (this.identifier.indexOf(event.touches[i].identifier) < 0) {
        this.identifier.push(event.touches[i].identifier);

        this.yTouches.start.push(event.touches[i].screenY);
        this.yTouches.total.push(0);
        this.yTouches.delta.push(0);
        this.yTouches.prev.push(event.touches[i].screenY);

        this.xTouches.start.push(event.touches[i].screenX);
        this.xTouches.total.push(0);
        this.xTouches.delta.push(0);
        this.xTouches.prev.push(event.touches[i].screenX);

        this.prevArea = this.startArea = this._area(this.xTouches.start, this.yTouches.start);
      }
    }
    if (!this.target) {
      this.target = event.touches[0].target;
    }
  }

  removeTouch(event) {
    let i, arr = [], id;
    for (i = 0; i < event.touches.length; i++) {
      arr.push(event.touches[i]);
    }
    id = this.identifier.findIndex((e) => (arr.indexOf(e) < 0));

    if (id >= 0) {
      this.identifier = this.identifier.splice(id, 1);
      this.yTouches.total = this.yTouches.total.splice(id, 1);
      this.yTouches.start = this.yTouches.start.splice(id, 1);
      this.yTouches.prev  = this.yTouches.prev.splice(id, 1);
      this.yTouches.delta = this.yTouches.delta.splice(id, 1);

      this.xTouches.total = this.xTouches.total.splice(id, 1);
      this.xTouches.start = this.xTouches.start.splice(id, 1);
      this.xTouches.prev  = this.xTouches.prev.splice(id, 1);
      this.xTouches.delta = this.xTouches.delta.splice(id, 1);

      if (this.identifier.length) {
        this.startArea = this._area(this.xTouches.start, this.yTouches.start);
        this.prevArea  = this._area(this.xTouches.prev, this.yTouches.prev);
        this.target = this.touches[0].target;
      }
    }
    if (!this.identifier.length) {
      this.target = null;
    }
  }

  updateTouches(event) {
    let i, id, rx = [], ry = [];

    for (i = 0; i < event.touches.length; i++) {
      id = this.identifier.indexOf(event.touches[i].identifier);
      rx[id] = this.xTouches.prev[id];
      ry[id] = this.yTouches.prev[id];
      this.yTouches.total[id] = event.touches[i].screenY - this.yTouches.start[id];
      this.yTouches.delta[id] = event.touches[i].screenY - this.yTouches.prev[id];
      this.yTouches.prev[id]  = event.touches[i].screenY;
      this.xTouches.total[id] = event.touches[i].screenX - this.xTouches.start[id];
      this.xTouches.delta[id] = event.touches[i].screenX - this.xTouches.prev[id];
      this.xTouches.prev[id]  = event.touches[i].screenX;
    }

    let a = this._area(this.xTouches.prev, this.yTouches.prev);

    // ensure that no rotation is present if we are not in an rotation event
    delete this.evOpts.detail.rotation;

    if (event.touches.length === 2 &&
        ((this.yTouches.delta[0] > 0 && this.yTouches.delta[1] <= 0) ||
         (this.yTouches.delta[1] > 0 && this.yTouches.delta[0] <= 0) ||
         (this.xTouches.delta[0] > 0 && this.xTouches.delta[1] <= 0) ||
         (this.xTouches.delta[1] > 0 && this.xTouches.delta[0] <= 0))) {
        // rotation detected
        // calculate the angle
        let p1 = {
          x: Math.max(...rx) - Math.min(...rx),
          y: Math.max(...ry) - Math.min(...ry)
        };
        let p2 = {
          x: Math.max(...this.xTouches.prev) - Math.min(...this.xTouches.prev),
          y: Math.max(...this.yTouches.prev) - Math.min(...this.yTouches.prev)
        };

        // check the direction
        let t1 = Math.atan2(p1.y, p1.x) - Math.atan2(p1.y, p1.x);
        let dir = t1 > 0 ? -1 : 1;
        this.evOpts.detail.rotation = dir * Math.atan2(p1.y - p2.y, p1.x - p2.x);
    }

    this.totalScale = a/this.startArea;
    this.deltaScale = a/this.prevArea;
    this.prevArea = a;
  }

  _area(xT, yT) {
    if (xT.length === 1) {
      return 1.0;
    }

    let minX = Math.min(...xT),
        maxX = Math.max(...xT),
        minY = Math.min(...yT),
        maxY = Math.max(...yT);

    return Math.abs(maxY-minY) * Math.abs(maxX-minX);
  }

  dispatchEvent(targetElement, eventType) {
    targetElement.dispatchEvent(new CustomEvent(eventType, this.evOpts));
  }
}

// get started without clogging the global namespace
new Jesta();
