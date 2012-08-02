(ns fb.lol
  (:use [jayq.core :only [$ inner delegate]]
        [jayq.util :only [clj->js]]
        [fb.sql :only  [do-proj do-buddies do-row do-cost do-costs add-cost add-buddy add-proj add-db! db-init]]
        ;'first-blood.fb.sql
        ;[fb.sql]
        ; FIXME get :use to import everything.
        ))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; page loading
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(def page-dyn-inits {})

(defn add-init! [name func]
  (def page-dyn-inits (into page-dyn-inits {name func})))

(defn load-template [name]
  (let [temp ($ (str "div.hidden div." name))
        temp (if (zero? (.-length temp)) ($ "div.hidden div.404") temp)
        body ($ "#top")
        newp (.hide ($ "<div id=\"newpage\"></div>"))]
    (.html (.append body (.append newp (.clone temp))))))

(defn swap-page []
  (let [newp ($ "#newpage")
        cont ($ "#content")
        hidd ($ "body div.hidden")]
    (.hide cont 300 #(do
                       (.remove cont)
                       (.show (.attr newp "id" "content"))))))

(defn load-dyn-page [name e]
   (if-let [f (page-dyn-inits name)]
     (f e)
     (do
       (load-template name)
       (swap-page))))

($ #(delegate ($ "body") "a" "click touchend"
              (fn [e] 
                (let [a    ($ (.-currentTarget e))
                      link (.attr a "href")]
                  (load-dyn-page link e)
                  false)))) 


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; pages
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn show-projects []
  (load-template "projects")
  (let [ul ($ "#newpage div ul")
        li ($ "#newpage div ul li")]
    (do-proj (fn [t r]
               (do-row (fn [i]
                         (.append ul (-> li 
                                       (.clone) 
                                       (.empty) 
                                       (.append (-> ($ "<a></a>")
                                                  (.text (.-name i))
                                                  (.attr "href" "proj")
                                                  (.data "pid" (.-id i)))))))
                       r)
               (swap-page)))))

(defn show-proj [e]
  (load-template "proj")
  (let [a       ($ (first ($ (.-currentTarget e))))
        pid     (.data a "pid")
        t       ($ "#newpage div.proj div.title")
        ul      ($ "#newpage div.proj div ul")
        li      ($ "<li></li>")
        a       ($ "<a></a>")
        set-cost-data (fn [tx r]
                        (do-row #(let [a  (-> a
                                            (.clone)
                                            (.text (.-name %))
                                            (.data "cid" (.-id %))
                                            (.data "pid" pid)
                                            (.attr "href" "cost"))
                                       li (-> li
                                            (.clone)
                                            (.append a)
                                            (.append (str " : $" (.-tot %))))]
                                   (.append ul li))
                                r))
        set-proj-data (fn [tx r]
                        (let [i  (.item (.-rows r) 0)
                              n  (.-name i)
                              id (.-id i)]
                          (.text t n) 
                          (do-costs set-cost-data id)
                          (swap-page)))]
    (.data ($ "#newpage div.proj div.menu a") "pid" pid)
    (do-proj set-proj-data pid)))

(defn canvas-rect [w-tot h-tot w]
  (let [c  (first ($ "<canvas></canvas>"))
        ctx (.getContext c "2d" w-tot h-tot)]
    (set! (. c -width) w-tot)
    (set! (. c -height) h-tot)
    (set! (. ctx -fillStyle) "#121")
    (.fillRect ctx 0 0 w-tot h-tot)
    (set! (. ctx -fillStyle) "#131") 
    (.fillRect ctx 0 0 w h-tot)
    ctx))

(defn show-cost [e]
  (load-template "cost")
  (let [a             ($ (first ($ (.-currentTarget e))))
        pid           (.data a "pid")
        cid           (.data a "cid")
        t             ($ "#newpage div.cost div.title")
        ul            ($ "#newpage div.cost div ul")
        li            ($ "<li></li>")
        a             ($ "<a></a>")
        w             (.width ($ "body"))
        h             50
        set-title     #(.text t (str (.-cname %) ": " (.-ctot %)))
        set-cost-data (fn [tx r]
                        (set-title (.item (.-rows r) 0))
                        (do-row #(let [nw  (int (* w (/ (.-btot %) (.-ctot %))))
                                       cvs (canvas-rect w h nw)
                                       a   (-> a
                                             (.clone)
                                             (.text (str (.-bname %) ": $" (.-btot %)))
                                             (.data "cid" cid)
                                             (.data "pid" pid))
                                       li  (-> li
                                             (.clone)
                                             (.append a)
                                             (.css "background-image" (str "url(" (.toDataURL (.-canvas cvs) "image/png") ")"))
                                             (.css "background-size" "100%"))]
                                   (.append ul li))
                                r)
                        (swap-page))]
    (do-cost set-cost-data cid)))

(add-init! "projects" show-projects)
(add-init! "proj" show-proj)
(add-init! "cost" show-cost)


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; forms
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn trigger-new-page [href data]
  (-> ($ "<a></a>")
    (.hide)
    (.attr "href" href)
    (#(reduce (fn [a [k v]] (.data a k v)) %1 data))
    (.appendTo ($ "#content"))
    (.click)))

(defn add-page-project []
  (let [name (.val ($ "#top div.new form [name=\"name\"]"))
        addp (fn [tx r]
               (trigger-new-page "proj" [["pid" (.-insertId r)]]))]
    ; FIXME make contracts
    (if (<= (count name) 0)
      (js/alert "Invalid name")
      (add-proj name addp))) 
  false)

(defn show-new-form []
  (load-template "new")
  (.submit ($ "#newpage div.new form") add-page-project)
  (swap-page))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;


(defn add-page-buddy []
  (let [i    ($ "#top div.buddies form [name=\"name\"]")
        name (.val i)
        pid  (.data i "pid")
        addb (fn [tx r]
               (trigger-new-page "buddies" [["pid" pid]]))] ; FIXME instead of reloading just add to current page
    (js/alert (str name pid))
    ; FIXME make contracts
    (if (<= (count name) 0)
      (js/alert "Invalid name")
      (add-buddy pid name "img" addb)))
  false)

(defn show-buddies [e]
  (load-template "buddies")
  (let [a       ($ (first ($ (.-currentTarget e))))
        pid     (.data a "pid")
        t       ($ "#newpage div.buddies div.title")
        inp     ($ "#newpage div.buddies form [name=\"name\"]")
        ul      ($ "#newpage div.buddies form div.list ul")
        li      ($ "<li></li>")
        w       (.width ($ "body"))
        h       50
        set-buddy-data (fn [tx r]
                         (do-row #(let [ptot (.-ptot %)
                                        btot (.-btot %)
                                        nw   (int (* w (/ (.-btot %) (.-ptot %))))
                                        cvs (canvas-rect w h nw)
                                        li (-> li
                                            (.clone)
                                            (.text (str (.-name %) ": " btot))
                                            (.data "bid" (.-id %))
                                            (.data "pid" pid)
                                            (.css "background-image" (str "url(" (.toDataURL (.-canvas cvs) "image/png") ")"))
                                            (.css "background-size" "100%")  
                                            )]
                                    (.append ul li))
                                 r))
        set-proj-data (fn [tx r] ; FIXME this is done too often, externalise.
                        (let [i  (.item (.-rows r) 0)
                              n  (.-name i)
                              id (.-id i)]
                          (.text t n) 
                          (.submit ($ "#newpage div.buddies form") add-page-buddy)
                          (do-buddies set-buddy-data id)
                          (swap-page)))]
    (.data inp "pid" pid)
    (do-proj set-proj-data pid)))

(add-init! "buddies" show-buddies)
(add-init! "new" show-new-form)


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; init
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

($ #(do
      (db-init)
      ;(add-proj "Mars!!!")
      ;(add-buddy 1 "harry" "img")
      ;(add-buddy 1 "jack" "img")
      ;(add-buddy 1 "john" "img")
      ;(add-buddy 1 "dalek" "img")
      ;(add-cost "firefly" [[1 100] [2 25] [3 125] [4 50]] 1 400)
      ;(add-cost "daban urnud" [[1 100] [2 25] [3 225] [4 50]] 1 400)
      ;(.hide ($ "#hidden"))
      (load-dyn-page "projects" nil)))


; DEBUG:
; #(js/console.log %)
;
; TODO:
; - v2: multiple people add finance to same projects
; - consolidate page drawing function; show-cost/proj/costs are too similar.
; - add phonegap for contacts.
; - add back/forward browser integration -> needed for back button
; - add total cost to project title
