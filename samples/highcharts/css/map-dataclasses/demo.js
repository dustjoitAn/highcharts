function drawChart(data) {
    return Highcharts.mapChart('container', {

        chart: {
            styledMode: true
        },

        title: {
            text: 'Named data classes'
        },

        mapNavigation: {
            enabled: true
        },

        legend: {
            title: {
                text: 'Population density'
            },
            align: 'left',
            verticalAlign: 'bottom',
            floating: true,
            layout: 'vertical',
            valueDecimals: 0,
            symbolRadius: 0,
            symbolHeight: 14
        },

        colorAxis: {
            dataClassColor: 'category',
            dataClasses: [{
                to: 20,
                name: 'Sparse (<20)'
            }, {
                from: 20,
                to: 200,
                name: 'Moderate (2 - 200)'
            }, {
                from: 200,
                name: 'Dense (>200)'
            }]
        },

        series: [{
            data: data,
            mapData: Highcharts.maps['custom/world'],
            joinBy: ['iso-a2', 'code'],
            name: 'Population density',
            tooltip: {
                valueSuffix: '/km²'
            }
        }]
    });
}

// Load the data from a Google Spreadsheet
// https://docs.google.com/a/highsoft.com/spreadsheet/pub?hl=en_GB&hl=en_GB&key=1gXzu9TYT3UvDMcoxj_kS7PUXMmC1MNVSfewccOs2dkA&output=html
Highcharts.data({
    googleAPIKey: 'AIzaSyCQ0Jh8OFRShXam8adBbBcctlbeeA-qJOk',
    googleSpreadsheetKey: '1gXzu9TYT3UvDMcoxj_kS7PUXMmC1MNVSfewccOs2dkA',

    // custom handler when the spreadsheet is parsed
    parsed: function (columns) {

        // Read the columns into the data array
        var data = [];
        columns[0].forEach((code, i) => {
            data.push({
                code: code.toUpperCase(),
                value: parseFloat(columns[2][i]),
                name: columns[1][i]
            });
        });

        drawChart(data);
    },

    error: function (html, xhr) {
        const chart = drawChart();
        chart.showLoading('Error loading sample data: ' + xhr.status);
    }
});
