(ns fb.pages
  (:use [jayq.core :only [$ inner delegate]]
        [jayq.util :only [clj->js]]
        [fb.sql :only [do-proj do-buddies do-row row-seq do-cost do-costs do-buddy do-settings
                       update-settings up-cost up-buddy
                       db-init add-cost add-buddy add-proj
                       nuke-db rm-proj rm-cost rm-buddy]]
        [fb.vis :only [set-title-project set-rect-back set-tot-rect-back money buddy]]
        [fb.misc :only [mk-settings add-data trim num]]
        ; FIXME get :use to import everything.
        ))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; page loading
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(def page-dyn-inits {})
(def back-pages nil)
(def jQT nil)

(defn add-page-init! [name func]
  (def page-dyn-inits (into page-dyn-inits {name func})))

(defn load-template [name]
  (let [temp ($ (str "div.hidden div." name))
        temp (if (zero? (.-length temp)) ($ "div.hidden div.404") temp)
        body ($ "body")
        newp (.hide ($ "<div id=\"newpage\"></div>"))]
    (.append body
             (-> newp
               (.append ($ "<div class=\"top\"></div>"))
               (.append (.append ($ "<div class=\"middle\"></div>")
                                 (.clone temp)))
               (.append ($ "<div class=\"bottom\"></div>"))
               (.append )))))

(defn swap-page [e a]
  (let [newp (.show ($ "#newpage"))
        cont ($ "#content")
        anim (.data a "anim")]
    (if anim
      (.goTo jQT "#newpage" anim)
      (.goTo jQT "#newpage" "slideleft"))
    (.attr newp "id" "content")
    (.attr cont "id" "old")))

; FIXME add this to an init function
($ #(.bind ($ "body") "pageAnimationEnd" (fn [e info]
                                           (.remove ($ "#old")))))

(defn load-dyn-page [name e a]
  (when (= name "settings")
    (let [[[name data] & back-end] back-pages]
      (def back-pages
        (cons [name {name (replace {["anim" "slideright"] ["anim" "flipleft"]} (name data))}]
              back-end))))
  (when (not= name "back")
    (def back-pages (cons [name {name (doall (cons ["anim" "slideright"]
                                                   (map #(vector % (.data a %)) ["pid" "bid" "cid"])))}]
                          (take 15 back-pages))))
  (if-let [f (page-dyn-inits name)]
    (f e a)
    (do
      (load-template name)
      (swap-page e a))))

; FIXME add this to an init function
($ #(delegate ($ "body") "a" "click touchend"
              (fn [e]
                (let [a    ($ (first ($ (.-currentTarget e))))
                      link (.attr a "href")]
                  (if (= "mailto" (apply str (take 6 link)))
                    true
                    (do
                      (load-dyn-page link e a)
                      false))))))

;; trigger a click to load new page
(defn trigger-new-page [href data]
  (-> ($ "<a></a>")
    (.hide)
    (.attr "href" href)
    (add-data href data)
    ;(#(reduce (fn [a [k v]] (.data a k v)) %1 data))
    (.appendTo ($ "#content"))
    (.click)))



;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; back;

(defn go-back [e]
  (let [[x [name d] & bs] back-pages]
    (def back-pages bs)
    (trigger-new-page name d)))

(add-page-init! "back" go-back)
