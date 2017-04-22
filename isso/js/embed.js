/*
 * Copyright 2014, Martin Zimmermann <info@posativ.org>. All rights reserved.
 * Distributed under the MIT license
 */

require(["app/lib/ready", "app/config", "app/i18n", "app/api", "app/isso", "app/count", "app/dom", "app/text/css", "app/text/svg", "app/jade"], function(domready, config, i18n, api, isso, count, $, css, svg, jade) {

    "use strict";

    jade.set("conf", config);
    jade.set("i18n", i18n.translate);
    jade.set("pluralize", i18n.pluralize);
    jade.set("svg", svg);

    domready(function() {

        if (config["css"]) {
            var style = $.new("style");
            style.type = "text/css";
            style.textContent = css.inline;
            $("head").append(style);
        }

        count();

        if ($("#isso-thread") === null) {
            return console.log("abort, #isso-thread is missing");
        }

        $("#isso-thread").append($.new('h4'));
        $("#isso-thread").append(new isso.Postbox(null));
        $("#isso-thread").append('<div id="isso-root"></div>');

        api.fetch($("#isso-thread").getAttribute("data-isso-id"),
            config["max-comments-top"],
            config["max-comments-nested"]).then(
            function(rv) {
                if (rv.total_replies === 0) {
                    $("#isso-thread > h4").textContent = i18n.translate("no-comments");
                    return;
                }

                var lastcreated = 0;
                var count = rv.total_replies;

                // Sorting functions
                var sortfuncs = {
                    oldest: function(a, b) { return a.created - b.created; },
                    newest: function(a, b) { return b.created - a.created; },
                    upvotes: function(a, b) { return b.likes - a.likes; },
                };

                // Handle sorting configuration
                var sort_by = config["sorting"].split(",")
                                               .map(function(x) { return x.trim(); })
                                               .filter(function(x) { return x; });
                function sortfunc(a, b) {
                    var i = 0;
                    while (true) {
                        var func = sortfuncs[sort_by[i]];
                        if (func === undefined) {
                            console.warn("Invalid sorting mode:", sort_by[i]);
                            return sortfuncs.oldest(a, b);
                        }
                        var compared = func(a, b);
                        if (compared == 0 && sort_by[i + 1] !== undefined) {
                            i++;
                        } else {
                            return compared;
                        }
                    }
                }
                if (sort_by.length === 0) {
                    console.warn("Invalid sorting config:", config["sorting"]);
                } else {
                    rv.replies.sort(sortfunc);
                }

                rv.replies.forEach(function(comment) {
                    isso.insert(comment, false);
                    if(comment.created > lastcreated) {
                        lastcreated = comment.created;
                    }
                    count = count + comment.total_replies;
                });
                $("#isso-thread > h4").textContent = i18n.pluralize("num-comments", count);

                if(rv.hidden_replies > 0) {
                    isso.insert_loader(rv, lastcreated);
                }

                if (window.location.hash.length > 0) {
                    $(window.location.hash).scrollIntoView();
                }
            },
            function(err) {
                console.log(err);
            }
        );
    });
});
