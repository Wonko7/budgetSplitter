(ns fb.vis
  (:use [jayq.core :only [$ inner delegate]]
        [jayq.util :only [clj->js]]
        [fb.sql :only [do-proj do-settings update-settings]]
        [fb.misc :only [mk-settings add-data get-current-page]]
        ))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; visualisation stuff
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn set-theme [settings]
  (.attr ($ "#settheme") "href" (str "themes/css/" (:theme settings) ".css")))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; ui elements;

;; round off value and return amount in a span
(let [sp (-> ($ "<span></span>")
           (.addClass "money"))]
  (defn money [amount]
    (-> sp
      (.clone)
      (.text (-> amount
               (str)
               (.replace #"^0*([0-9]*\.?[0-9]{0,2})?.*$" "$$$1")
               (#(if (= 1 (count %)) "$0" %)))))))

(let [sp (-> ($ "<span></span>")
           (.addClass "buddy"))]
  (defn buddy [name]
    (-> sp
      (.clone)
      (.text name))))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; menu & title & info;

(defn add-menu [pid settings]
  (let [place (if (= :top (:menuPos settings))
                ($ "#newpage div.top")
                ($ "#newpage div.bottom"))
        menu  (.clone ($ "div.hidden div.menu"))]
    (.append place (if (:menuOn settings)
                     (.show menu)
                     (.hide menu))))  ;; FIXME get show/hide from settings
  (let [ulr ($ "#newpage div.menu div.right ul")
        ull ($ "#newpage div.menu div.left ul")
        li  ($ "<li></li>")
        a   ($ "<a></a>")
        curr (get-current-page :new)
        data {"settings" [["anim" "flipright"]]}
        links (remove #(let [li (second %)]
                         (cond (or (= li "indivbuddy") (= li "buddies")) (or (= curr "indivbuddy") (= curr "buddies"))
                               (or (= li "newcost") (= li "proj"))       (or (= curr "newcost") (= curr "proj"))
                               :else (= li curr)))
                      [["Home" "projects"]
                       ["Expenses" "proj"]
                       ["Buddies" "buddies"]
                       ["Total" "total"]
                       ["Settings" "settings"]])
        half (/ (count links) 2)
        add #(doseq [[t l] %1]
               (.append %2 (-> li
                             (.clone)
                             (.append (-> a
                                        (.clone)
                                        (.data "pid" pid)
                                        (.attr "href" l)
                                        (.text t)
                                        (add-data l data))))))]
    (add (take half links) ull)
    (add (drop half links) ulr)))

;; sets the template's page title then executes a user fn
;; with the following prototype: fn [pid projname totalcost sqltx]
(defn set-title-project [f pid]
  (let [sett (fn [tx r]
               (let [i        (.item (.-rows r) 0)
                     n        (.-name i)
                     id       (.-id i)
                     tot      (.-tot i)
                     settings (mk-settings r)
                     a        ($ "<a></a>")
                     help     ($ "#newpage div.info")]
                 (if (:help settings)
                   (.show help)
                   (.hide help))
                 (-> ($ "#newpage div.top")
                   (.data "pid" pid)
                   (.append (-> ($ "<div class=\"toolbar\"></div>")
                              (.append (-> ($ "<h1></h1>")
                                         (.append (-> a
                                                    (.clone)
                                                    (.attr "href" "proj")
                                                    (.data "pid" pid)
                                                    (.append (str n ": "))
                                                    (.append (money tot))))))
                              (.append (-> a
                                         (.clone)
                                         (.addClass "back")
                                         (.addClass "button")
                                         (.attr "href" "back")
                                         (.text "Back")))
                              (.append (-> a
                                         (.clone)
                                         (.addClass "button")
                                         (.attr "href" "menu")
                                         (.text "Menu")
                                         (.bind "click touchend"
                                                (fn []
                                                  (do-settings (fn [settings]
                                                                 (let [menu     ($ "#content div.menu")
                                                                       settings (into settings {:menuOn (not (:menuOn settings))})
                                                                       on       (:menuOn settings)]
                                                                   (update-settings settings #(if on
                                                                                                (.show menu)
                                                                                                (.hide menu))))))
                                                  false)))))))
                 (add-menu pid settings)
                 (f id n tot tx)))]
    (do-proj sett pid)))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; validate input and hide button;

(defn mk-validate [addb]
  (.hide ($ addb))
  (partial (fn [addb e]
             (let [inp   ($ (.-currentTarget e))
                   addb  ($ addb)]
               (if (zero? (count (.val inp)))
                 (.hide addb)
                 (.show addb))))
           (.replace addb
                     #"^#newpage(.*)$"
                     "#content$1")))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; focus:

(defn give-input-focus
  ([inp]
   (.bind (.parents inp "li:first")
          "focus click touchend"
          (fn [e]
            (.trigger (.children ($ (.-currentTarget e))
                                 "input")
                      "focus")))
   inp)
  ([li lisel]
   (.bind li
          "focus click touchend"
          (fn [e]
            (.trigger (.children ($ (.-currentTarget e))
                                 "input")
                      "focus")))
   li)
  ([li lisel radiosel]
   (.bind li
          "focus click touchend"
          (fn [e]
            (let [inp (.children ($ (.-currentTarget e)) "input")]
              (if (= "radio "(.attr inp "type"))
                (.attr inp "checked" true)
                (.attr inp "checked" (not (.attr inp "checked")))))))
   li))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; canvas background;

(defn canvas-rect [w-tot h-tot w]
  (let [c   (first ($ "<canvas></canvas>"))
        ctx (.getContext c "2d" w-tot h-tot)]
    (set! (. c -width) w-tot)
    (set! (. c -height) h-tot)
    (set! (. ctx -fillStyle) "#121")
    (.fillRect ctx 0 0 w-tot h-tot)
    (set! (. ctx -fillStyle) "#131") ; FIXME css that shit
    (.fillRect ctx 0 0 w h-tot)
    ctx))

(defn set-rect-back [elt tot amount]
  (let [w   (.width ($ "body"))
        h   50
        nw  (int (* w (/ amount tot)))
        cvs (canvas-rect w h nw) ]
    (-> elt
      (.css "background-image" (str "url(" (.toDataURL (.-canvas cvs) "image/png") ")"))
      (.css "background-size" "100%")))  )

(defn canvas-rect-take [w-tot h-tot wpaid avg max]
  (let [c   (first ($ "<canvas></canvas>"))
        ctx (.getContext c "2d" w-tot h-tot)]
    (set! (. c -width) w-tot)
    (set! (. c -height) h-tot)
    (set! (. ctx -fillStyle) "#121")
    (.fillRect ctx 0 0 w-tot h-tot)
    (set! (. ctx -fillStyle) "#131") ; FIXME css that shit
    (.fillRect ctx 0 0 avg h-tot)
    (set! (. ctx -fillStyle) "#252") ; FIXME css that shit
    (.fillRect ctx avg 0 (- wpaid avg) h-tot)
    (set! (. ctx -fillStyle) "#33F") ; FIXME css that shit
    (.fillRect ctx avg 0 2 h-tot)
    ctx))

(defn canvas-rect-give [w-tot h-tot wpaid avg]
  (let [c   (first ($ "<canvas></canvas>"))
        ctx (.getContext c "2d" w-tot h-tot)]
    (set! (. c -width) w-tot)
    (set! (. c -height) h-tot)
    (set! (. ctx -fillStyle) "#121")
    (.fillRect ctx 0 0 w-tot h-tot)
    (set! (. ctx -fillStyle) "#131") ; FIXME css that shit
    (.fillRect ctx 0 0 wpaid h-tot)
    (set! (. ctx -fillStyle) "#822") ; FIXME css that shit
    (.fillRect ctx wpaid 0 (- avg wpaid) h-tot)
    (set! (. ctx -fillStyle) "#33F") ; FIXME css that shit
    (.fillRect ctx avg 0 2 h-tot)
    ctx))

(defn set-tot-rect-back [elt max avg amount]
  (let [w   (.width ($ "body"))
        h   50
        np  (int (* w (/ amount max)))
        na  (int (* w (/ avg max)))
        cvs ((if (> np na) canvas-rect-take canvas-rect-give) w h np na)]
    (-> elt
      (.css "background-image" (str "url(" (.toDataURL (.-canvas cvs) "image/png") ")"))
      (.css "background-size" "100%"))))
