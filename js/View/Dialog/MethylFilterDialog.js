define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/dom-construct',
    'dijit/focus',
    'dijit/registry',
    'dijit/form/NumberSpinner',
    'dijit/form/CheckBox',
    'JBrowse/View/Dialog/WithActionBar',

    'dijit/form/Button'
],
  function (
    declare,
    lang,
    array,
    on,
    dom,
    focus,
    registry,
    dijitNumberSpinner,
    dijitCheckbox,
    ActionBarDialog,
    Button
  ) {

    return declare(ActionBarDialog, {
      /**
       * Dijit Dialog subclass to change the min
       * and max score of XYPlots
       */

      //title: 'Filter methylation context',
      title: '<img src="plugins/MethylationPlugin/img/methyl-filter-blank.png" height="16px" width="16px" id="smrna-filter-dialog-img">Filter methylation context',
      //autofocus: false,

      constructor: function (args) {
        this.browser = args.browser;
        this.props = this._initializeProperties(args);

        this.isAnimal = args.config.isAnimal;

        this.setCallback = args.setCallback || function () {};
        this.cancelCallback = args.cancelCallback || function () {};
      },

      _initializeProperties: function (args) {
        var opts = {};
        opts['show4mC'] = {
          id: 'show-4mc',
          value: (args.config.show4mC === undefined ? true : args.config.show4mC),
          classId: '4mc',
          label: 'Show 4mC'
        }
        opts['showCG'] = {
          id: 'show-cg',
          value: (args.config.showCG === undefined ? true : args.config.showCG),
          classId: 'cg',
          label: 'Show 5mCG'
        }
        // CHG vs CHH
        if (this.isAnimal) {
          opts['showCH'] = {
            id: 'show-ch',
            value: (args.config.showCH === undefined ? true : args.config.showCH),
            classId: 'ch',
            label: 'Show 5mCH'
          }
        } else {
          opts['showCHG'] = {
            id: 'show-chg',
            value: (args.config.showCHG === undefined ? true : args.config.showCHG),
            classId: 'chg',
            label: 'Show 5mCHG'
          }
          opts['showCHH'] = {
            id: 'show-chh',
            value: (args.config.showCHH === undefined ? true : args.config.showCHH),
            classId: 'chh',
            label: 'Show 5mCHH'
          }
        }
        opts['show5hmC'] = {
          id: 'show-5hmc',
          value: (args.config.show5hmC === undefined ? true : args.config.show5hmC),
          classId: '5hmc',
          label: 'Show 5hmC'
        }
        opts['show6mA'] = {
          id: 'show-6ma',
          value: (args.config.show6mA === undefined ? true : args.config.show6mA),
          classId: '6ma',
          label: 'Show 6mA'
        }
        return opts
      },

      _fillActionBar: function (actionBar) {
        var ok_button = new Button({
          label: "OK",
          onClick: lang.hitch(this, function () {
            this.filterCallback();
            var out = {
              isAnimal: this.isAnimal
            };
            for (var ctx in this.props) {
              out[ctx] = this.props[ctx].value;
            }
            this.setCallback && this.setCallback(out);
            this.hide();
          })
        }).placeAt(actionBar);

        var cancel_button = new Button({
          label: "Cancel",
          onClick: lang.hitch(this, function () {
            this.cancelCallback && this.cancelCallback();
            this.hide();
          })
        }).placeAt(actionBar);
      },

      filterCallback: function () {
        var dialog = this;

        var tracks = dialog.browser.view.visibleTracks();
        array.forEach(tracks, function (track) {
          if (!/\b(Methyl.*Plot)/.test(track.config.type))
            return;
          var cssLabel = track.config.label.replace(/\./g, '-');
          for (var ctx in dialog.props) {
            var ctxInfo = dialog.props[ctx];
            var val = ctxInfo.value;
            // change config
            if (val !== undefined) {
              if (ctx === 'showCH') {
                track.config.showCHG = val;
                track.config.showCHH = val;
              } else {
                track.config[ctx] = val;
              }
            }
            // fix check boxes
            var l;
            var mark;
            if (track.config.isAnimal && (ctxInfo.classId === 'chg' || ctxInfo.classId === 'chh')) {
              l = cssLabel + '-ch-checkbox';
              mark = registry.byId(l);
              if (mark)
                mark.set('checked', (track.config.showCHG && track.config.showCHH));
            } else if (!track.config.isAnimal && ctxInfo.classId === 'ch') {
              l = cssLabel +'-chg-checkbox';
              mark = registry.byId(l);
              if (mark)
                mark.set('checked', val);
              l = cssLabel + '-chh-checkbox';
              mark = registry.byId(l);
              if (mark)
                mark.set('checked', val);
            } else {
              l = cssLabel + '-' + ctxInfo.classId + '-checkbox';
              mark = registry.byId(l);
              if (mark)
                mark.set('checked', val);
            }
          } // end for ctx
          track.changed();
        }); // end for track
      },

      show: function (callback) {
        var dialog = this;
        dojo.addClass(this.domNode, 'methyl-filter-dialog');

        // content pane
        var outerPane = dom.create('div', {
          id: 'methyl-dialog-outer-pane'
        });
        var pane = dom.create('div', {
          id: 'methyl-dialog-pane'
        }, outerPane);
        var ctx;
        for (ctx in this.props) {
          var obj = dialog.props[ctx];
          var box = new dijitCheckbox({
            id: 'methyl-dialog-' + obj.id + '-box',
            title: obj.label,
            _prop: ctx,
            'class': 'track-' + obj.classId + '-checkbox',
            checked: (obj.value === true ? true : false)
          });
          box.onClick = lang.hitch(this, '_setProp', box);
          pane.appendChild(box.domNode);
          dom.create('label', {
            "for": 'methyl-dialog-' + obj.id + '-box',
            innerHTML: obj.label
          }, pane);
          pane.appendChild(dom.create('br'));
        } // end for ctx

        this.set('content', [
            outerPane
        ]);

        this.inherited(arguments);
        this.domNode.style.width = 'auto';
      },

      _setProp: function (box) {
        if (this.props.hasOwnProperty(box._prop)) {
          this.props[box._prop]['value'] = box.checked;
        }
      },

      hide: function () {
        this.inherited(arguments);
        window.setTimeout(dojo.hitch(this, 'destroyRecursive'), 500);
      }
    });
  });
