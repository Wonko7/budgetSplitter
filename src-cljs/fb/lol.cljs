(ns fb.lol
  (:use [jayq.core :only [$ inner delegate]]
        [jayq.util :only [clj->js]]))


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
;;;;;; sql storage
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(def db)

(defn add-db! [name schema]
  (let [n (apply str (next (str name)))]
    (.transaction db
                  (fn [t]
                    (.executeSql t (str "CREATE TABLE IF NOT EXISTS " n " ( " schema " );"))))))

(defn add-proj [name f]
  (.transaction db
                (fn [t]
                  (.executeSql t "INSERT INTO projects (name) VALUES (?);" (clj->js [name]) 
                               f))))
(defn add-buddy [name img]
  (.transaction db
                (fn [t]
                  (.executeSql t "INSERT INTO buddies (name, img) VALUES (?, ?);" (clj->js [name img])))))

(defn add-cost [name buddies proj amount]
  (.transaction db
                (fn [t]
                  (.executeSql t "INSERT INTO costs (name, pid, tot) VALUES (?, ?, ?);" (clj->js [name proj amount])
                               (fn [t r]
                                 (doseq [[b c] buddies]
                                   (.executeSql t "INSERT INTO relcbp (pid, bid, cid, tot) VALUES (?, ?, ?, ?);"
                                                (clj->js [proj b (.-insertId r) c])
                                                ; #(js/alert (str :done [proj b (.-insertId r) 3] ))
                                                ; #(js/alert (str :failed [proj b (.-insertId r) 3] ))
                                                ))) 
                               ; #(js/alert "INSERT INTO costs (name, pid, tot) VALUES (?, ?); failed."))
                               ))))

(defn do-select [f rq]
  (.transaction db
                (fn [t]
                  (.executeSql t rq (clj->js [])
                               #(f %1 %2)
                               #(js/alert (str "fuck. " (.-message %2)))
                               ))))

(defn do-proj [f & [id]]
  (let [rq (if id
             (str "SELECT * FROM projects WHERE projects.id = " id ";" )
             "SELECT * FROM projects;")]
    (do-select f rq)))

(defn do-costs [f id]
  (let [rq (str "SELECT * FROM costs WHERE costs.pid = " id ";" )]
    (do-select f rq)))  

(defn do-cost [f id]
  (let [rq (str "SELECT costs.name AS cname, buddies.name AS bname, costs.tot AS ctot, relcbp.tot AS btot, relcbp.id, relcbp.bid, relcbp.cid "
                "FROM costs, relcbp, buddies "
                "WHERE costs.id = " id " AND relcbp.cid = costs.id AND relcbp.bid = buddies.id;")]
    (do-select f rq)))

(defn do-row [f r]
  (doseq [i (range (.-length (.-rows r)))]
    (f (.item (.-rows r) i))))


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
                                                  (.data "projid" (.-id i)))))))
                       r)
               (swap-page)))))

(defn show-proj [e]
  (load-template "proj")
  (let [a       ($ (first ($ (.-currentTarget e))))
        pid     (.data a "projid")
        t       ($ "#newpage div.proj div.title")
        ul      ($ "#newpage div.proj div ul")
        li      ($ "<li></li>")
        a       ($ "<a></a>")
        set-cost-data (fn [tx r]
                        (do-row #(let [a  (-> a
                                            (.clone)
                                            (.text (.-name %))
                                            (.data "costid" (.-id %))
                                            (.data "projid" pid)
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
        pid           (.data a "projid")
        cid           (.data a "costid")
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
                                             (.data "costid" cid)
                                             (.data "projid" pid))
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


(defn add-page-project []
  ; FIXME make contracts 
  ;(js/alert (.val ($ "#top div.new form [name=\"name\"]")))
  (let [name (.val ($ "#top div.new form [name=\"name\"]"))
        addp (fn [tx r]
               (-> ($ "<a></a>")
                 (.attr "href" "proj")
                 (.data "projid" (.-insertId r))
                 (.hide)
                 (.appendTo ($ "#content"))
                 (.click)))] ; FIXME omg create better events
    (if (<= (count name) 0)
      (js/alert "Invalid name")
      (add-proj name addp))) 
  false)

(defn show-new-form []
  (load-template "new")
  (.submit ($ "#newpage div.new form") add-page-project)
  (swap-page))

(add-init! "new" show-new-form)

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; init
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

($ #(do
      (def db (js/openDatabase "projs" "1.0" "projs" 65536))
      (add-db! :projects (str " id   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"
                              " name TEXT NOT NULL"))
      (add-db! :buddies  (str " id   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"
                              " name TEXT NOT NULL,"
                              " img  TEXT NOT NULL"))
      (add-db! :costs    (str " id   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"
                              " pid  INTEGER NOT NULL,"
                              " name TEXT NOT NULL,"
                              " tot  NUMERIC NOT NULL"))
      (add-db! :relcbp   (str " id   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"
                              " pid  INTEGER NOT NULL,"
                              " bid  INTEGER NOT NULL,"
                              " cid  INTEGER NOT NULL,"
                              " tot  NUMERIC NOT NULL"))
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
; - 
