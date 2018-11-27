/**
 * Networkgraph series
 *
 * (c) 2010-2018 Paweł Fus
 *
 * License: www.highcharts.com/license
 */

'use strict';
import H from '../../parts/Globals.js';
import '../../parts/Utilities.js';
import '../../parts/Options.js';
import '/layouts.js';

var addEvent = H.addEvent,
    defined = H.defined,
    extend = H.extend,
    seriesType = H.seriesType,
    pick = H.pick,
    Point = H.Point;

/**
 * A networkgraph is a type of relationship chart, where connnections
 * (links) attracts nodes (points) and other nodes repulse each other.
 *
 * @extends      {plotOptions.line}
 * @product      highcharts
 * @sample       highcharts/demo/networkgraph/
 *               Networkgraph
 * @since        7.0.0
 * @excluding    boostThreshold, animation
 * @optionparent plotOptions.networkgraph
 */
seriesType('networkgraph', 'line', {
    marker: {
        enabled: true
    },
    dataLabels: {
        format: '{key}'
    },
    /**
     * Link style options
     */
    link: {
        /**
         * Ideal length (px) of the link between two nodes. When not defined,
         * length is calculated as:
         * `Math.pow(availableWidth * availableHeight / nodesLength, 0.4);`
         *
         * Note: Because of the algorithm specification, length of each link
         * might be not exactly as specified.
         *
         * @type      {number}
         * @product   highcharts
         * @apioption series.networkgraph.link.length
         * @sample    {highcharts} highcharts/series-networkgraph/styled-links/
         *            Numerical values
         * @defaults  undefined
         */

        /**
         * A name for the dash style to use for links.
         *
         * @type      {number}
         * @product   highcharts
         * @apioption series.networkgraph.link.dashStyle
         * @defaults  undefined
         */

        /**
         * Color of the link between two nodes.
         */
        color: 'rgba(100, 100, 100, 0.5)',
        /**
         * Width (px) of the link between two nodes.
         */
        width: 1
    },
    /**
     * Flag to determine if nodes are draggable or not.
     */
    draggable: true,
    layoutAlgorithm: {
        type: 'reingold-fruchterman',
        maxIterations: 1000,
        repulsiveForce: function (d, k) {
            /*
            basic, not recommended:
            return k / d;
            */

            /*
            standard:
            return k * k / d;
            */

            /*
            grid-variant:
            return k * k / d * (2 * k - d > 0 ? 1 : 0);
            */

            return k * k / d;
        },
        attractiveForce: function (d, k) {
            /*
            basic, not recommended:
            return d / k;
            */
            return d * d / k;
        }
    }
}, {
    isNetworkgraph: true,
    drawGraph: null,
    isCartesian: false,
    requireSorting: false,
    directTouch: true,
    noSharedTooltip: true,
    trackerGroups: ['group', 'markerGroup', 'dataLabelsGroup'],
    drawTracker: H.TrackerMixin.drawTrackerPoint,
    // Animation is run in `series.simulation`.
    animate: null,
    /**
     * Create a single node that holds information on incoming and outgoing
     * links.
     */
    createNode: function (id) {

        function findById(nodes, id) {
            return H.find(nodes, function (node) {
                return node.id === id;
            });
        }

        var node = findById(this.nodes, id),
            PointClass = this.pointClass,
            options;

        if (!node) {
            options = this.options.nodes && findById(this.options.nodes, id);
            node = (new PointClass()).init(
                this,
                extend({
                    className: 'highcharts-node',
                    isNode: true,
                    id: id,
                    y: 1 // Pass isNull test
                }, options)
            );
            node.linksTo = [];
            node.linksFrom = [];
            node.formatPrefix = 'node';
            node.name = node.name || node.id; // for use in formats

            this.nodes.push(node);
        }
        return node;
    },

    /**
     * Extend generatePoints by adding the nodes, which are Point objects
     * but pushed to the this.nodes array.
     */
    generatePoints: function () {
        var nodeLookup = {},
            chart = this.chart;

        H.Series.prototype.generatePoints.call(this);

        if (!this.nodes) {
            this.nodes = []; // List of Point-like node items
        }
        this.colorCounter = 0;

        // Reset links from previous run
        this.nodes.forEach(function (node) {
            node.linksFrom.length = 0;
            node.linksTo.length = 0;
        });

        // Create the node list and set up links
        this.points.forEach(function (point) {
            if (defined(point.from)) {
                if (!nodeLookup[point.from]) {
                    nodeLookup[point.from] = this.createNode(point.from);
                }
                nodeLookup[point.from].linksFrom.push(point);
                point.fromNode = nodeLookup[point.from];

                // Point color defaults to the fromNode's color
                if (chart.styledMode) {
                    point.colorIndex = pick(
                        point.options.colorIndex,
                        nodeLookup[point.from].colorIndex
                    );
                } else {
                    point.color =
                        point.options.color || nodeLookup[point.from].color;
                }

            }
            if (defined(point.to)) {
                if (!nodeLookup[point.to]) {
                    nodeLookup[point.to] = this.createNode(point.to);
                }
                nodeLookup[point.to].linksTo.push(point);
                point.toNode = nodeLookup[point.to];
            }

            point.name = point.name || point.id; // for use in formats
        }, this);
    },

    /**
     * Run pre-translation by generating the nodeColumns.
     */
    translate: function () {
        if (!this.processedXData) {
            this.processData();
        }
        this.generatePoints();

        this.deferLayout();

        this.nodes.forEach(function (node) {
            // Draw the links from this node
            node.isInside = true;
            node.linksFrom.forEach(function (point) {

                point.shapeType = 'path';

                // Pass test in drawPoints
                point.y = 1;
            });
        });
    },

    deferLayout: function () {
        var layoutOptions = this.options.layoutAlgorithm,
            graphLayoutsStorage = this.chart.graphLayoutsStorage,
            layout;

        if (!graphLayoutsStorage) {
            this.chart.graphLayoutsStorage = graphLayoutsStorage = {};
        }

        layout = graphLayoutsStorage[layoutOptions.type];

        if (!layout) {
            graphLayoutsStorage[layoutOptions.type] = layout =
                new H.layouts[layoutOptions.type](layoutOptions);
        }

        this.layout = layout;

        layout.setArea(0, 0, this.chart.plotWidth, this.chart.plotHeight);
        layout.addSeries(this);
        layout.addNodes(this.nodes);
        layout.addLinks(this.points);
    },

    /**
     * Extend the render function to also render this.nodes together with
     * the points.
     */
    render: function () {
        var points = this.points,
            hoverPoint = this.chart.hoverPoint;

        // Render markers:
        this.points = this.nodes;
        H.seriesTypes.line.prototype.render.call(this);
        this.points = points;

        points.forEach(function (point) {
            point.renderLink();
            point.redrawLink();
        });

        if (hoverPoint && hoverPoint.series === this) {
            this.redrawHalo(hoverPoint);
        }
    },

    /*
     * Draggable mode:
     */
    redrawHalo: function (point) {
        if (point && this.halo) {
            this.halo.attr({
                d: point.haloPath(
                    this.options.states.hover.halo.size
                )
            });
        }
    },
    onMouseDown: function (point, event) {
        var normalizedEvent = this.chart.pointer.normalize(event);

        point.fixedPosition = {
            chartX: normalizedEvent.chartX,
            chartY: normalizedEvent.chartY,
            plotX: point.plotX,
            plotY: point.plotY
        };
    },
    onMouseMove: function (point, event) {
        if (point.fixedPosition) {
            var series = this,
                chart = series.chart,
                normalizedEvent = chart.pointer.normalize(event),
                diffX = point.fixedPosition.chartX - normalizedEvent.chartX,
                diffY = point.fixedPosition.chartY - normalizedEvent.chartY,
                newPlotX,
                newPlotY;

            // At least 5px to apply change (avoids simple click):
            if (Math.abs(diffX) > 5 || Math.abs(diffY) > 5) {
                newPlotX = point.fixedPosition.plotX - diffX;
                newPlotY = point.fixedPosition.plotY - diffY;

                if (chart.isInsidePlot(newPlotX, newPlotY)) {
                    point.plotX = newPlotX;
                    point.plotY = newPlotY;

                    series.redrawHalo();

                    if (!series.layout.simulation ||
                        series.layout.simulation.stopped
                    ) {
                        // Start new simulation:
                        series.layout.run();
                    } else {
                        // Extend current simulation:
                        series.layout.resetSimulation();
                    }
                }
            }
        }
    },
    onMouseUp: function (point) {
        if (point.fixedPosition) {
            delete point.fixedPosition;
        }
    }
}, {
    // Links:
    getLinkAttribues: function () {
        var linkOptions = this.series.options.link;

        return {
            'stroke-width': linkOptions.width,
            stroke: linkOptions.color,
            dashstyle: linkOptions.dashStyle
        };
    },
    renderLink: function () {
        if (!this.graphic) {
            this.graphic = this.series.chart.renderer
                .path(
                    this.getLinkPath(this.fromNode, this.toNode)
                )
                .attr(this.getLinkAttribues())
                .add(this.series.group);
        }
    },
    redrawLink: function () {
        if (this.graphic) {
            this.graphic.animate({
                d: this.getLinkPath(this.fromNode, this.toNode)
            });
        }
    },
    getLinkPath: function (from, to) {
        return [
            'M',
            from.plotX,
            from.plotY,
            'L',
            to.plotX,
            to.plotY
        ];

        /*
        IDEA: different link shapes?
        return [
            'M',
            from.plotX,
            from.plotY,
            'Q',
            (to.plotX + from.plotX) / 2,
            (to.plotY + from.plotY) / 2 + 15,
            to.plotX,
            to.plotY
        ];*/
    },
    // Default utils:
    destroy: function () {
        if (this.isNode) {
            this.linksFrom.forEach(
                function (linkFrom) {
                    if (linkFrom.graphic) {
                        linkFrom.graphic = linkFrom.graphic.destroy();
                    }
                }
            );
        }

        return Point.prototype.destroy.apply(this, arguments);
    }
});

H.addEvent(H.seriesTypes.networkgraph, 'updatedData', function () {
    if (this.layout) {
        this.layout.stop();
    }
});

/*
 * Multiple series support:
 */
addEvent(H.Chart, 'render', function () {
    if (this.graphLayoutsStorage) {
        H.setAnimation(false, this);
        H.objectEach(
            this.graphLayoutsStorage,
            function (layout) {
                layout.run();
            }
        );
        delete this.graphLayoutsStorage;
    }
});

/*
 * Draggable mode:
 */
addEvent(
    H.seriesTypes.networkgraph.prototype.pointClass,
    'mouseOver',
    function () {
        H.css(this.series.chart.container, { cursor: 'move' });
    }
);
addEvent(
    H.seriesTypes.networkgraph.prototype.pointClass,
    'mouseOut',
    function () {
        H.css(this.series.chart.container, { cursor: 'default' });
    }
);
addEvent(
    H.Chart,
    'load',
    function () {
        var chart = this,
            unbinders = [];

        unbinders.push(
            addEvent(
                chart.container,
                'mousedown',
                function (event) {
                    var point = chart.hoverPoint;

                    if (
                        point &&
                        point.series &&
                        point.series.isNetworkgraph &&
                        point.series.options.draggable
                    ) {
                        point.series.onMouseDown(point, event);
                        unbinders.push(
                             addEvent(
                                chart.container,
                                'mousemove',
                                function (e) {
                                    return point.series.onMouseMove(point, e);
                                }
                            )
                        );
                        unbinders.push(
                             addEvent(
                                chart.container.ownerDocument,
                                'mouseup',
                                function (e) {
                                    return point.series.onMouseUp(point, e);
                                }
                            )
                        );
                    }
                }
            )
        );

        addEvent(chart, 'destroy', function () {
            unbinders.forEach(function (unbind) {
                unbind();
            });
        });
    }
);

/**
 * A `networkgraph` series. If the [type](#series.networkgraph.type) option is
 * not specified, it is inherited from [chart.type](#chart.type).
 *
 * @type      {Object}
 * @extends   series,plotOptions.networkgraph
 * @excluding boostThreshold, animation
 * @product   highcharts
 * @apioption series.networkgraph
 */

/**
 * An array of data points for the series. For the `networkgraph` series type,
 * points can be given in the following way:
 *
 * An array of objects with named values. The following snippet shows only a
 * few settings, see the complete options set below. If the total number of
 * data points exceeds the series'
 * [turboThreshold](#series.area.turboThreshold), this option is not available.
 *
 *  ```js
 *     data: [{
 *         from: 'Category1',
 *         to: 'Category2'
 *     }, {
 *         from: 'Category1',
 *         to: 'Category3'
 *     }]
 *  ```
 *
 * @type      {Array<Object|Array|Number>}
 * @extends   series.line.data
 * @excluding drilldown,marker,x,y
 * @sample    {highcharts} highcharts/chart/reflow-true/
 *            Numerical values
 * @sample    {highcharts} highcharts/series/data-array-of-arrays/
 *            Arrays of numeric x and y
 * @sample    {highcharts} highcharts/series/data-array-of-arrays-datetime/
 *            Arrays of datetime x and y
 * @sample    {highcharts} highcharts/series/data-array-of-name-value/
 *            Arrays of point.name and y
 * @sample    {highcharts} highcharts/series/data-array-of-objects/
 *            Config objects
 * @product   highcharts
 * @apioption series.networkgraph.data
 */


/**
 * The node that the link runs from.
 *
 * @type      {String}
 * @product   highcharts
 * @apioption series.networkgraph.data.from
 */

/**
 * The node that the link runs to.
 *
 * @type      {String}
 * @product   highcharts
 * @apioption series.networkgraph.data.to
 */

/**
 * The weight of the link.
 *
 * @type      {Number}
 * @product   highcharts
 * @apioption series.networkgraph.data.weight
 */
