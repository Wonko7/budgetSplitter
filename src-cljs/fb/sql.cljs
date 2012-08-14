(ns fb.sql
  (:use [jayq.core :only [$ inner delegate]]
        [jayq.util :only [clj->js]]))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; sql storage
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(def db)

(defn add-db! [name schema]
  (let [n (apply str (next (str name)))]
    (.transaction db
                  (fn [t]
                    (.executeSql t (str "CREATE TABLE IF NOT EXISTS " n " ( " schema " );"))))))

(defn db-init []
  (def db (js/openDatabase "projs" "1.0" "projs" 65536)) 
  (add-db! :projects (str " id   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"
                          " name TEXT NOT NULL")) 
  (add-db! :buddies  (str " id   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"
                          " pid  INTEGER NOT NULL,"
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
                          " tot  NUMERIC NOT NULL"))) 

(defn add-proj [name f]
  (.transaction db
                (fn [t]
                  (.executeSql t "INSERT INTO projects (name) VALUES (?);" (clj->js [name]) 
                               f))))
(defn add-buddy [proj name img f]
  (.transaction db
                (fn [t]
                  (.executeSql t "INSERT INTO buddies (name, pid, img) VALUES (?, ?, ?);" (clj->js [name proj img])
                               f
                               #(js/alert (str "fuck. " (.-message %2)))
                               ))))

(defn add-cost [name buddies proj amount f]
  (.transaction db
                (fn [t]
                  (.executeSql t "INSERT INTO costs (name, pid, tot) VALUES (?, ?, ?);" (clj->js [name proj amount])
                               (fn [t r]
                                 (doseq [[b c] buddies]
                                   (.executeSql t "INSERT INTO relcbp (pid, bid, cid, tot) VALUES (?, ?, ?, ?);"
                                                (clj->js [proj b (.-insertId r) c])
                                                ; #(js/alert (str "relcpb fuck. " (.-message %2)))
                                                ; #(js/alert (str :done [proj b (.-insertId r) 3] ))
                                                ; #(js/alert (str :failed [proj b (.-insertId r) 3] ))
                                                ))) 
                               ;#(js/alert "costs failed. " (.-message %2))
                               )))
  (f)) ; FIXME; this is the only function where user fun called potentially before finishing transaction. important?

(defn do-select [f rq]
  (.transaction db
                (fn [t]
                  (.executeSql t rq (clj->js [])
                               f
                               #(js/alert (str "fuck. " (.-message %2)))
                               ))))

(defn do-proj [f & [id]]
  (let [rq (if id
             (str "SELECT projects.id, projects.name, SUM(costs.tot) AS tot FROM projects, costs "
                  "WHERE projects.id = " id " AND costs.pid = projects.id "
                  "GROUP BY projects.id "
                  "UNION ALL SELECT  projects.id, projects.name, 0 AS tot FROM projects "
                  "WHERE projects.id = " id " AND NOT EXISTS (SELECT * FROM costs WHERE projects.id = costs.pid )"
                  " ;")
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

(defn row-seq [r]
  (for [i (range (.-length (.-rows r)))]
    (.item (.-rows r) i)))

(defn do-buddies [f pid]
  (let [rq (str "SELECT buddies.name, buddies.id, buddies.img, SUM(relcbp.tot) AS btot, SUM(costs.tot) AS ptot "
                "FROM buddies, relcbp, costs "
                "WHERE buddies.id = relcbp.bid AND buddies.pid = " pid " and relcbp.pid = " pid " AND costs.pid = " pid " AND relcbp.cid = costs.id "
                "GROUP BY buddies.id "
                "UNION ALL SELECT buddies.name, buddies.id, buddies.img, 0 AS btot, 100 AS ptot FROM buddies "
                "WHERE NOT EXISTS (SELECT * FROM relcbp, costs WHERE buddies.id = relcbp.bid AND buddies.pid = relcbp.pid AND relcbp.cid = costs.id AND costs.pid = buddies.pid)"
                " ;")]
    ;(lol)
    (do-select f rq)))

(defn nuke-db []
  (.transaction db
                (fn [t]
                  (.executeSql t "DROP TABLE IF EXISTS projects;"  (clj->js [])
                               (fn [t r] (.executeSql t "DROP TABLE buddies;" (clj->js [])
                                                      (fn [t r] (.executeSql t "DROP TABLE costs;" (clj->js [])
                                                                             (fn [t r] (.executeSql t "DROP TABLE relcbp;" (clj->js [])
                                                                                                    #(js/alert (str "dropped."))
                                                                                                    #(js/alert (str "fuck. " (.-message %2)))
                                                                                                    ))
                                                                             #(js/alert (str "fuck. " (.-message %2)))
                                                                             ))
                                                      #(js/alert (str "fuck. " (.-message %2)))
                                                      ))
                               #(js/alert (str "fuck. " (.-message %2)))
                               )))) 
