/**
 * jestap
 *
 * ES6 gesture detection
 */

/*jslint white: true, vars: true, sloppy: true, devel: true, plusplus: true, browser: true */


/**
 * register to the document to catch all touch events.
 * trigger CustomEvent() for detected gestures
 */
class jestap {
  construct(opts) {
    this.opts = {};
    if (typeof opts === "object") {
      this.opts = opts;
    }

    // register to document
    document.addEventListener("touchstart",  (e) => this.touchStart(e));
    document.addEventListener("touchend",    (e) => this.touchEnd(e));
    document.addEventListener("touchcancel", (e) => this.touchCancel(e));
    document.addEventListener("touchmove",   (e) => this.touchMove(e));
  }

  touchStart(event) {
    if (!this.android && !this.ios) {
      this.android = (!event.scale && event.scale !== 0);
      this.ios = (!this.android);
    }

    if (!this.identifier.length) {
      this.opts = {
        'scale': 0.0,
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
    }

    this.addTouch(event);
  }

  touchMove(event) {
    if (this.android) {
        event.preventDefault();
    }

    this.updateTouches(event);

    this.opts.scale = this.deltaScale;
    this.opts.touches = event.touches;
    this.opts.count = this.identifier.length;
    this.opts.targetTouches = event.targetTouches;
    this.opts.changedTouches = event.changedTouches;

    if (this.deltaScale > 1.0) {
      this.dispatchEvent(this.target, "pinchwiden");
    }
    else if (this.deltaScale < 1.0) {
      this.dispatchEvent(this.target, "pinchnarrow");
    }
    else {
      this.dispatchEvent(this.target, "move");
    }
  }

  touchEnd(event) {
    let endTime = new Date().getTime();

    this.opts.duration = endTime - this.startTime;
    this.opts.scale = this.totalScale;
    this.opts.count = this.identifier.length;
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
    if (Math.max(...this.xTouches.total) <= this.opts.tapDistance &&
        Math.max(...this.yTouches.total) <= this.opts.tapDistance) {
      if (dt >= this.opts.tapLongTime) {
        ev = "long" + ev;
      }
      this.tapped = true;
      this.dispatchEvent(this.target, ev);
    }
  }

  detectSwipeOrFlick() {
    if (Math.max(...this.xTouches.total) >= this.opts.flickDistance ||
        Math.max(...this.yTouches.total) >= this.opts.flickDistance) {
          this.opts.distance = {
            "x": Math.max(...this.xTouches.total),
            "y": Math.max(...this.yTouches.total)
          };
          if (this.duration < this.opts.flickTime) {
            this.dispatchEvent(this.target, "flick");
          }
          else {
            this.dispatchEvent(this.target, "swipe");
          }
    }
  }

  detectPinchOrStretch() {
    if (!this.tapped) {
      if (this.opts.scale > 1.2) {
        if (this.opts.count === 2) {
          this.dispatchEvent(this.target, "stretch");
        }
        else {
          this.dispatchEvent(this.target, "spread");
        }
      }
      else if (this.opts.scale < 0.8) {
        if (this.opts.count === 2) {
          this.dispatchEvent(this.target, "pinch");
        }
        else {
          this.dispatchEvent(this.target, "grab");
        }
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
      this.target = this.touches[0].target;
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
  }

  updateTouches(event) {
    let i, id;
    for (i = 0; i < event.touches.length; i++) {
      id = this.identifier.indexOf(event.touches[i].identifier);
      this.yTouches.total[id] = event.touches[i].screenY - this.yTouches.start[id];
      this.yTouches.delta[id] = event.touches[i].screenY - this.yTouches.prev[id];
      this.yTouches.prev[id]  = event.touches[i].screenY;
      this.xTouches.total[id] = event.touches[i].screenX - this.xTouches.start[id];
      this.xTouches.delta[id] = event.touches[i].screenX - this.xTouches.prev[id];
      this.xTouches.prev[id]  = event.touches[i].screenX;
    }
    let a = this._area(this.xTouches.prev, this.yTouches.prev);
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
    targetElement.dispatchEvent(new CustomEvent(eventType, this.opts));
  }
}
