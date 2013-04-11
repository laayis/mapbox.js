describe('mapbox.gridLayer', function() {
    var server, element, map;

    beforeEach(function() {
        server = sinon.fakeServer.create();
        element = document.createElement('div');
        document.body.appendChild(element);
        element.style.width = '256px';
        element.style.height = '256px';
        map = mapbox.map(element);
    });

    afterEach(function() {
        element.remove();
        server.restore();
    });

    describe('constructor', function() {
        it('is initialized', function() {
            var layer = mapbox.gridLayer();
            expect(layer).to.be.ok();
        });

        it('is initialized with tilejson', function() {
            var layer = mapbox.gridLayer(helpers.tileJSON);
            expect(layer).to.be.ok();
            expect(layer.getTileJSON()).to.be.eql(helpers.tileJSON);
        });
    });

    describe('#getTileJSON', function() {
        it('is by default empty', function() {
            var layer = mapbox.gridLayer();
            expect(layer.getTileJSON()).to.eql({});
        });
    });

    describe('#loadURL', function() {
        it('loads a TileJSON object', function(done) {
            var layer = mapbox.gridLayer();

            layer.loadURL('http://a.tiles.mapbox.com/v3/mapbox.map-0l53fhk2.json', function(err, json) {
                expect(this).to.equal(layer);
                expect(err).to.equal(null);
                expect(json).to.eql(helpers.tileJSON);
                done();
            });

            server.respondWith("GET", "http://a.tiles.mapbox.com/v3/mapbox.map-0l53fhk2.json",
                [200, { "Content-Type": "application/json" }, JSON.stringify(helpers.tileJSON)]);
            server.respond();
        });
    });

    describe('#loadID', function() {
        it('loads a TileJSON object', function(done) {
            var layer = mapbox.gridLayer();

            layer.loadID('mapbox.map-0l53fhk2', function(err, json) {
                expect(this).to.equal(layer);
                expect(err).to.equal(null);
                expect(json).to.eql(helpers.tileJSON);
                done();
            });

            server.respondWith("GET", "http://a.tiles.mapbox.com/v3/mapbox.map-0l53fhk2.json",
                [200, { "Content-Type": "application/json" }, JSON.stringify(helpers.tileJSON)]);
            server.respond();
        });
    });

    describe('#setTileJSON', function() {
        it('sets TileJSON', function() {
            var layer = mapbox.gridLayer();
            expect(layer.setTileJSON(helpers.tileJSON)).to.eql(layer);
            expect(layer.getTileJSON()).to.eql(helpers.tileJSON);
        });

        it('makes no tile requests if the JSON has an empty "grids" property', function() {
            map.setView([0, 0], 1);

            var layer = mapbox.gridLayer()
                .addTo(map);

            layer.setTileJSON(L.extend({}, helpers.tileJSON, {grids: []}));
            expect(server.requests).to.eql([]);
        });
    });

    describe('tile loading', function() {
        function requestURLs() {
            return server.requests.map(function(request) {
                return request.url;
            });
        }

        it('requests tiles for the current view', function() {
            map.setView([0, 0], 0);

            mapbox.gridLayer({grids: ['{z}/{x}/{y}']})
                .addTo(map);

            expect(requestURLs()).to.eql(['0/0/0']);
        });

        it('requests no tiles for zooms less than the minimum', function() {
            map.setView([0, 0], 0);

            mapbox.gridLayer({grids: ['{z}/{x}/{y}'], minzoom: 1})
                .addTo(map);

            expect(requestURLs()).to.eql([]);
        });

        it('requests no tiles for zooms greater than the maximum', function() {
            map.setView([0, 0], 15);

            mapbox.gridLayer({grids: ['{z}/{x}/{y}'], maxzoom: 14})
                .addTo(map);

            expect(requestURLs()).to.eql([]);
        });

        it('requests no tiles outside of bounds', function() {
            map.setView([0, 0], 10);

            mapbox.gridLayer({grids: ['{z}/{x}/{y}'], bounds: [-10,-10,-5,-5]})
                .addTo(map);

            expect(requestURLs()).to.eql([]);
        });
    });

    describe('events', function() {
        var layer;

        var grid = {
            grid: [],
            keys: ["", "1"],
            data: {"1": "data"}
        };

        for (var i = 0; i < 32; i++) {
            grid.grid[i] = "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
        }

        for (; i < 64; i++) {
            grid.grid[i] = "                                                                "
        }

        beforeEach(function() {
            map.setView([0, 0], 0);

            layer = mapbox.gridLayer({grids: ['{z}/{x}/{y}']})
                .addTo(map);

            server.respondWith('GET', '0/0/0',
                [200, { "Content-Type": "application/json" }, JSON.stringify(grid)]);
            server.respond();
        });

        it('emits click when an area with data is clicked', function(done) {
            layer.on('click', function(e) {
                expect(e.data).to.equal("data");
                done();
            });

            map.fire('click', {latlng: L.latLng(1, 0)});
        });

        it('emits click with null data when an area without data is clicked', function(done) {
            layer.on('click', function(e) {
                expect(e.data).to.equal(null);
                done();
            });

            map.fire('click', {latlng: L.latLng(-1, 0)});
        });

        it('emits mouseover when entering an area with data', function(done) {
            layer.on('mouseover', function(e) {
                expect(e.data).to.equal("data");
                done();
            });

            map.fire('mousemove', {latlng: L.latLng(1, 0)});
        });

        it('emits no repetitive mouseover events', function() {
            var calls = 0;

            layer.on('mouseover', function(e) {
                calls += 1;
            });

            map.fire('mousemove', {latlng: L.latLng(1, 0)});
            map.fire('mousemove', {latlng: L.latLng(1, 0)});

            expect(calls).to.equal(1);
        });

        it('emits no mouseover events for dataless areas', function() {
            var calls = 0;

            layer.on('mouseover', function(e) {
                calls += 1;
            });

            map.fire('mousemove', {latlng: L.latLng(-1, 0)});

            expect(calls).to.equal(0);
        });

        it('emits mousemove when moving in an area with data', function(done) {
            layer.on('mousemove', function(e) {
                expect(e.data).to.equal("data");
                done();
            });

            map.fire('mousemove', {latlng: L.latLng(1, 0)});
            map.fire('mousemove', {latlng: L.latLng(1, 0)});
        });

        it('emits mouseout when exiting an area with data', function(done) {
            layer.on('mouseout', function(e) {
                expect(e.data).to.equal("data");
                done();
            });

            map.fire('mousemove', {latlng: L.latLng(1, 0)});
            map.fire('mousemove', {latlng: L.latLng(-1, 0)});
        });

        it('emits no mouseout for dataless areas', function() {
            var calls = 0;

            layer.on('mouseout', function(e) {
                calls += 1;
            });

            map.fire('mousemove', {latlng: L.latLng(-1, 0)});
            map.fire('mousemove', {latlng: L.latLng(1, 0)});
        });
    })
});
