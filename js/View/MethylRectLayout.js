/**
 * Adapted from GranularRectLayout.js
 *
 * 'pitchX' and 'pitchY' are ratios of input scale resolution to
 * internal bitmap resolution
 */
define("MethylationPlugin/View/MethylRectLayout", [
  'dojo/_base/declare'
],
  function (declare) {
    return declare(null, {
      /**
       * @param args.pitchX  layout grid pitch in the X direction
       * @param args.maxHeight  maximum layout height, default Infinity (no max)
       */
      constructor: function (args) {
        //console.log(JSON.stringify(args));
        this.pitchX = args.pitchX || 10;
        this.bitmap = [];
        this.rectangles = {};
        this.maxHeight = Math.ceil((args.maxHeight || Infinity));
        this.maxFeatHeight = this.maxHeight / 2;
        this.originY = (args.originY || (this.maxHeight == Infinity ? 600 : Math.floor(this.maxHeight / 2.0)));
      },

      /**
       * @returns {Number} top position for the rect, or Null if laying out the rect would exceed maxHeight
       */
      addRect: function (id, left, right, score, data) {
        // if we have already laid it out, return its layout
        if (id in this.rectangles) {
          var storedRec = this.rectangles[id];
          if (storedRec.top === null)
            return null;

          // add it to the bitmap again, since that bitmap range may have been discarded
          this._addRectToBitmap(storedRec, data);
          return {top: storedRec.top, height: storedRec.h};
        }

        var pLeft = Math.floor(left / this.pitchX);
        var pRight = Math.floor(right / this.pitchX);
        var pHeight = Math.ceil(Math.abs(score) * this.maxFeatHeight);

        var midX = Math.floor((pLeft + pRight) / 2);
        var rectangle = {
          id: id,
          l: pLeft,
          r: pRight,
          mX: midX,
          h: pHeight
        };
        var strand = 0;
        if (data){
          rectangle.data = data;
          strand = data.data.strand;
        }
        var top;
        // negative strand
        if (strand == -1) {
          top = this.originY;
        } else if (strand == 1) {
          top = this.originY - pHeight;
        }
          rectangle.top = top;
          this._addRectToBitmap(rectangle, data);
          this.rectangles[id] = rectangle;
          return {top: top, height: pHeight};

      },

      /**
       * make a subarray if it does not exist
       * @private
       */
      _autovivify: function (array, subscript) {
        return array[subscript] ||
          (function () {
            var a = [];
            array[subscript] = a;
            return a;
          })();
      },

      _addRectToBitmap: function (rect, data) {
        if (rect.top === null)
          return;

        data = data || true;
        var bitmap = this.bitmap;
        var av = this._autovivify;
        var y = (data.data.strand === -1 ? 1 : 0);
        if (rect.r - rect.l > 20000) {
            av(bitmap, y).allFilled = data;
        } else {
            var row = av(bitmap, y);
            for (var x = rect.l; x < rect.r; x++)
              row[x] = data;
        }
      },

      /**
       *  Given a range of X coordinates, deletes all data dealing with
       *  the features.
       */
      discardRange: function (left, right) {
        //console.log( 'discard', left, right );
        var pLeft = Math.floor(left / this.pitchX);
        var pRight = Math.floor(right / this.pitchX);
        var bitmap = this.bitmap;
        for (var y = 0; y < bitmap.length; ++y) {
          var row = bitmap[y];
          if (row)
            for (var x = pLeft; x <= pRight; ++x) {
              delete row[x];
            }
        }
      },

      hasSeen: function (id) {
        return !!this.rectangles[id];
      },

      getByID: function (id) {
        var r = this.rectangles[id];
        if (r) {
          return r.data || true;
        }
        return undefined;
      },

      cleanup: function () {},

      getTotalHeight: function () {
        return this.maxHeight;
      },

      getOriginY: function () {
        return this.originY;
      }
    });
  });
