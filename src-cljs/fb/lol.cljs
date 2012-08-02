(ns fb.lol
  (:use [jayq.core :only [$ inner delegate]]
        [jayq.util :only [clj->js]]
        [fb.sql :only  [do-proj do-buddies do-row do-cost do-costs add-cost add-buddies add-proj add-db! db-init]]
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


(defn show-buddies [e]
  (load-template "buddies")
  (let [a       ($ (first ($ (.-currentTarget e))))
        pid     (.data a "pid")
        t       ($ "#newpage div.buddies div.title")
        d       ($ "#newpage div.buddies form div.list")
        i       ($ "<input class=\"text\" type=\"text\" name=\"name\" />")
        set-buddy-data (fn [tx r]
                        (do-row #(let [i (-> i
                                            (.clone)
                                            (.val (.-name %))
                                            (.data "bid" (.-id %))
                                            (.data "pid" pid)
                                            )]
                                   (.append d i))
                                r))
        set-proj-data (fn [tx r] ; FIXME this is done too often, externalise.
                        (let [i  (.item (.-rows r) 0)
                              n  (.-name i)
                              id (.-id i)]
                          (.text t n) 
                          (do-buddies set-buddy-data id)
                          (.submit ($ "#newpage div.buddies form") add-buddies)
                          (swap-page)))]
    (do-proj set-proj-data pid)))

(add-init! "new" show-new-form)


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; init
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

($ #(do
      (db-init)
      ;(add-proj "Mars!!!")
      ;(add-buddy "harry" "img")
      ;(add-buddy "jack" "img")
      ;(add-buddy "john" "img")
      ;(add-buddy "dalek" "img")
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
