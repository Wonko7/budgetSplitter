(defproject first-blood "1.0.0"
  :dependencies [[org.clojure/clojure "1.4.0"]
                 ]
  :plugins [[lein-cljsbuild "0.2.6"]]
  :cljsbuild {
    :builds [{
        ; The path to the top-level ClojureScript source directory:
        :source-path "src-cljs"
        ; The standard ClojureScript compiler options:
        ; (See the ClojureScript compiler documentation for details.)
        :compiler {
                   :output-to "web/js/main.js"  ; default: main.js in current directory
                   :optimizations :whitespace
                   :externs ["web/js-static/jquery-min.js"
                             "web/js-static/src/jqtouch.min.js" 
                             "web/js-static/src/jqtouch-jquery.min.js"] 
                   ; :optimizations :advanced
                   :pretty-print true}}]})
