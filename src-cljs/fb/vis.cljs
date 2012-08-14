(ns fb.vis
  (:use [jayq.core :only [$ inner delegate]]
        [jayq.util :only [clj->js]]
        [fb.sql :only  [do-proj do-buddies do-row do-cost do-costs add-cost add-buddy add-proj add-db! db-init]]
        ))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; visualisation stuff
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;


;; round off value and return amount in a span
(let [sp (-> ($ "<span></span>")
           (.addClass "money"))]
  (defn money [amount]
    (-> sp
      (.clone)
      (.text (-> amount
               (str)
               (.replace #"^([0-9]*\.?[0-9]{0,2})?.*$" "$$$1"))))))

(let [sp (-> ($ "<span></span>")
           (.addClass "buddy"))]
  (defn buddy [name]
    (-> sp
      (.clone)
      (.text name))))

(defn add-menu [pid]
  (let [top   ($ "#newpage div.top")
        menu  (.clone ($ "div.hidden div.menu"))]
    (.append top (.show menu)))  ;; FIXME get show/hide from settings
  (let [ulr ($ "#newpage div.menu div.right ul")
        ull ($ "#newpage div.menu div.left ul")
        li  ($ "<li></li>")
        a   ($ "<a></a>")
        ll  [["Costs" "proj"]
             ["Buddies" "buddies"] ]
        lr  [["Total" "total"]
             ["Setting" "settings"]]
        add #(doseq [[t l] %1]
               (.append %2 (-> li
                             (.clone)
                             (.append (-> a
                                        (.clone)
                                        (.data "pid" pid)
                                        (.attr "href" l)
                                        (.text t))))))]
    (add ll ull)
    (add lr ulr)))

; sets the template's page title then executes a user fn
; with the following prototype: fn [pid projname totalcost sqltx]
(defn set-title-project [f pid]
  (let [sett (fn [tx r]
               (let [i   (.item (.-rows r) 0)
                     n   (.-name i)
                     id  (.-id i)
                     tot (.-tot i)
                     a   (.addClass ($ "<a></a>") "button")]
                 (-> ($ "#newpage div.top")
                   (.data "pid" pid) 
                   (.append (-> ($ "<div class=\"toolbar\"></div>")
                              (.append (-> ($ "<h1></h1>")
                                         (.append (str n ": "))
                                         (.append (money tot))))
                              (.append (-> a
                                         (.clone)
                                         (.addClass "back")
                                         (.attr "href" "back")
                                         (.text "Back")))
                              (.append (-> a
                                         (.clone)
                                         (.attr "href" "menu")
                                         (.text "Menu")
                                         (.bind "click touchend" #(do
                                                                    (.toggle ($ "#content div.menu") 300)
                                                                    false)))))))
                 (add-menu pid)
                 (f id n tot tx)))]
    (do-proj sett pid)))

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
      (.css "background-size" "100%")))  )
