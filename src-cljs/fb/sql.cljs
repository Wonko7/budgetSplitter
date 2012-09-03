(ns fb.sql
  (:use [jayq.core :only [$ inner delegate]]
        [jayq.util :only [clj->js]]
        [fb.misc :only [mk-settings trim]]
        [fb.init :only [add-init!]]
        ))


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; sql storage
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(def db)

(defn do-select [f rq]
  (.transaction db
                (fn [t]
                  (.executeSql t rq (clj->js [])
                               f
                               #(js/alert (str "fuck. " (.-message %2)))
                               ))))

(defn init-settings [t r]
  (.executeSql t "SELECT * FROM settings;"
               (clj->js [])
               #(if (zero? (.-length (.-rows %2)))
                  (.executeSql %1 "INSERT INTO settings (menuPos, menuOn, help, theme, optIn) VALUES (1, 1, 1, \"jqtouch-edited\", 1);" (clj->js [])
                               ))))

(defn add-db! [name schema & [f]]
  (let [n (apply str (next (str name)))]
    (.transaction db
                  (fn [t]
                    (let [rq (str "CREATE TABLE IF NOT EXISTS " n " ( " schema " );")]
                      (if f
                        (.executeSql t rq (clj->js []) f)
                        (.executeSql t rq)))))))

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
  (add-db! :settings (str " id   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"
                          " menuPos INTEGER NOT NULL,"
                          " menuOn INTEGER NOT NULL,"
                          " optIn INTEGER NOT NULL,"
                          " theme TEXT NOT NULL,"
                          " help INTEGER NOT NULL")
           init-settings)
  (add-db! :relcbp   (str " id   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"
                          " pid  INTEGER NOT NULL,"
                          " bid  INTEGER NOT NULL,"
                          " cid  INTEGER NOT NULL,"
                          " tot  NUMERIC NOT NULL")))

(add-init! db-init)

(defn update-settings [settings f]
    (.transaction db
     (fn [t]
       (.executeSql t "UPDATE settings SET menuPos = ?, menuOn = ?, help = ?, theme = ? WHERE id = 1;"
                    (clj->js [(if (= :top (:menuPos settings)) 1 0)
                              (if (:menuOn settings) 1 0)
                              (if (:help settings) 1 0)
                              (:theme settings)])
                    f))))

(defn do-settings [f]
  (let [rq (str "SELECT settings.menuOn, settings.menuPos, settings.help, settings.theme FROM settings "
                " ;")]
    (do-select #(f (mk-settings %2)) rq)))


(defn add-proj [name f]
  (.transaction db
                (fn [t]
                  (.executeSql t "INSERT INTO projects (name) VALUES (?);" (clj->js [(trim name)])
                               f))))

(defn add-buddy [proj name img f]
  (.transaction db
                (fn [t]
                  (.executeSql t "INSERT INTO buddies (name, pid, img) VALUES (?, ?, ?);" (clj->js [(trim name) proj img])
                               f
                               #(js/alert (str "fuck. " (.-message %2)))
                               ))))

(defn up-buddy [bid name img f]
  (.transaction db
                (fn [t]
                  (.executeSql t
                               (str "UPDATE buddies SET name = ?, img = ? WHERE id = " bid "; ")
                               (clj->js [(trim name) img])
                               f))))

(defn up-cost [cid name buddies-add buddies-up buddies-rm proj amount f]
  (let [do-cbud (fn [f rq vals]
                  (fn [t r]
                    (.executeSql t rq (clj->js vals) f #(js/alert (str "fuck. " (.-message %2))))))
        addrq "INSERT INTO relcbp (pid, bid, cid, tot) VALUES (?, ?, ?, ?);"
        uprq   #(str "UPDATE relcbp SET tot = ? WHERE id = " % ";")
        rmrq   #(str "DELETE FROM relcbp WHERE id = " % ";")
        fns    (reduce #(do-cbud %1 addrq [proj (:bid %2) cid (:tot %2)]) f   buddies-add)
        fns    (reduce #(do-cbud %1 (uprq (:rid %2)) [(:tot %2)])         fns buddies-up)
        fns    (reduce #(do-cbud %1 (rmrq (:rid %2)) [])                  fns buddies-rm)]
    (.transaction db
                  (fn [t]
                    (.executeSql t
                                 (str "UPDATE costs SET name = ?, pid = ?, tot = ? WHERE id = " cid "; ")
                                 (clj->js [(trim name) proj amount])
                                 fns)))))

(defn add-cost [name buddies proj amount f]
  (let [do-cbud (fn [f vals]
                  (fn [t r]
                    (.executeSql t
                                 "INSERT INTO relcbp (pid, bid, cid, tot) VALUES (?, ?, ?, ?);"
                                 (clj->js vals)
                                 f #(js/alert (str "fuck. " (.-message %2))))))]
    (.transaction db
                  (fn [t]
                    (.executeSql t
                                 "INSERT INTO costs (name, pid, tot) VALUES (?, ?, ?);"
                                 (clj->js [(trim name) proj amount])
                                 (fn [t r]
                                  ((reduce #(do-cbud %1 [proj (:bid %2) (.-insertId r) (:tot %2)]) f buddies) t r)))))))

(defn do-proj [f & [id]]
  (let [rq (if id
             (str "SELECT projects.id, projects.name, SUM(relcbp.tot) AS tot, settings.menuOn, settings.menuPos, settings.help FROM projects, relcbp, settings "
                  "WHERE projects.id = " id " AND relcbp.pid = projects.id "
                  "GROUP BY projects.id "
                  "UNION ALL SELECT  projects.id, projects.name, 0 AS tot, settings.menuOn, settings.menuPos, settings.help FROM projects, settings "
                  "WHERE projects.id = " id " AND NOT EXISTS (SELECT * FROM relcbp WHERE projects.id = relcbp.pid )"
                  " ;")
             "SELECT * FROM projects;")]
    (do-select f rq)))

(defn do-costs [f id]
  (let [rq (str "SELECT costs.name, costs.id, SUM(relcbp.tot) AS tot FROM costs, relcbp "
                "WHERE costs.pid = " id " "
                "AND relcbp.cid = costs.id "
                "GROUP BY costs.id "
                ";" )]
    (do-select f rq)))

(defn do-cost [f id]
  (let [rq (str "SELECT costs.name AS cname, buddies.name AS bname, costs.tot AS ctot, relcbp.tot AS btot, relcbp.id, relcbp.bid, relcbp.cid "
                "FROM costs, relcbp, buddies "
                "WHERE costs.id = " id " AND relcbp.cid = costs.id AND relcbp.bid = buddies.id;")]
    (do-select f rq)))

(defn do-buddy [f id]
  (let [rq (str "SELECT costs.name AS cname, buddies.name AS bname, costs.tot AS ctot, relcbp.tot AS btot "
                "FROM costs, relcbp, buddies "
                "WHERE relcbp.bid = " id " AND relcbp.cid = costs.id AND relcbp.bid = buddies.id "
                "GROUP BY costs.id "
                "UNION ALL SELECT 0 AS cname, buddies.name AS bname, 0 AS ctot, 0 AS btot FROM buddies "
                "WHERE buddies.id = " id " "
                "AND NOT EXISTS (SELECT * FROM relcbp WHERE relcbp.bid = " id " );"
                )]
    (do-select f rq)))

(defn do-row [f r]
  (doseq [i (range (.-length (.-rows r)))]
    (f (.item (.-rows r) i))))

(defn row-seq [r]
  (for [i (range (.-length (.-rows r)))]
    (.item (.-rows r) i)))

(defn do-buddies [f pid & [cid]]
  (let [rq (if cid
             (str "SELECT buddies.name AS bname, buddies.id, buddies.img, relcbp.tot AS btot, SUM(costs.tot) AS ptot, costs.name AS cname, relcbp.id AS rid "
                  "FROM buddies, relcbp, costs "
                  "WHERE buddies.id = relcbp.bid AND buddies.pid = " pid " and relcbp.pid = " pid " AND costs.pid = " pid " AND relcbp.cid = costs.id "
                  "AND relcbp.cid = " cid " "
                  "GROUP BY buddies.id "
                  "UNION ALL SELECT buddies.name, buddies.id, buddies.img, 0 AS btot, 0 AS ptot, 0 AS cname, 0 AS rid FROM buddies "
                  "WHERE buddies.pid = " pid " "
                  "AND NOT EXISTS (SELECT * FROM relcbp WHERE buddies.id = relcbp.bid AND relcbp.cid = " cid " ) "
                  " ;")
             (str "SELECT buddies.name AS bname, buddies.id, buddies.img, SUM(relcbp.tot) AS btot, SUM(costs.tot) AS ptot "
                  "FROM buddies, relcbp, costs "
                  "WHERE buddies.id = relcbp.bid AND buddies.pid = " pid " and relcbp.pid = " pid " AND costs.pid = " pid " AND relcbp.cid = costs.id "
                  "GROUP BY buddies.id "
                  "UNION ALL SELECT buddies.name, buddies.id, buddies.img, 0 AS btot, 100 AS ptot FROM buddies "
                  "WHERE buddies.pid = " pid " "
                  "AND NOT EXISTS (SELECT * FROM relcbp, costs WHERE buddies.id = relcbp.bid AND buddies.pid = relcbp.pid AND relcbp.cid = costs.id AND costs.pid = buddies.pid)"
                  " ;"))]
    (do-select f rq)))

(defn do-total [f pid]
  (let [rq-buds  (str "SELECT buddies.name AS bname, buddies.id AS bid, buddies.img FROM buddies WHERE buddies.pid = " pid " ;")
        rq-costs #(str "SELECT relb.cid, SUM(relb.tot) as btot, relc.nbbuds, relc.ctot FROM relcbp AS relb "
                       " INNER JOIN ( SELECT reld.cid, COUNT(reld.bid) AS nbbuds, SUM(reld.tot) AS ctot FROM relcbp AS reld "
                       "              WHERE reld.pid = " pid " GROUP BY reld.cid ) AS relc "
                       "  ON relc.cid = relb.cid  "
                       " WHERE relb.bid = " % " "
                       " GROUP BY relb.cid ;")
        mk-cost  (fn [r]
                   (doall (for  [c (row-seq r)]
                            {:cid (.-cid c) :btot (.-btot c) :nbbuds (.-nbbuds c) :ctot (.-ctot c)})))
        mk-buds  (fn [b r [bb & bs]]
                   (cons b (cons (into bb {:costs (mk-cost r)}) bs)))
        do-bud   (fn [f b buddies]
                   (let [b {:bname (.-bname b) :bid (.-id b) :btot (.-btot b)}]
                     (fn [t r]
                       (.executeSql t (rq-costs (:bid b)) (clj->js [])
                                    (f (mk-buds b r buddies))
                                    #(js/alert (str "fuck. " (.-message %2)))))))
        do-buds  (fn [t r]
                   (((reduce #(partial do-bud %1 %2) #(fn [t r]
                                                         (f (drop-last (next (mk-buds nil r %)))))
                             (row-seq r))
                       [{}]) t r))]
    (do-buddies do-buds pid)))

(defn rm [rq & [f]]
  (fn [t r]
    (if f
      (.executeSql t rq (clj->js []) f   #(js/alert (str "rm fuck. " (.-message %2))))
      (.executeSql t rq (clj->js []) nil #(js/alert (str "rm fuck. " (.-message %2)))))))

(defn rm-proj [f pid]
  (let [
        rq-p (str "DELETE FROM projects WHERE projects.id = " pid " ;")
        rq-b (str "DELETE FROM buddies WHERE buddies.pid = " pid " ;")
        rq-c (str "DELETE FROM costs WHERE costs.pid = " pid " ;")
        rq-r (str "DELETE FROM relcbp WHERE relcbp.pid = " pid " ;")
        ;rq (str "BEGIN; "
        ;        "DELETE FROM projects WHERE projects.id = " pid " ;"
        ;        "DELETE FROM buddies WHERE buddies.pid = " pid " ; "
        ;        "DELETE FROM costs WHERE costs.pid = " pid " ; "
        ;        "DELETE FROM relcbp WHERE relcbp.pid = " pid " ; "
        ;        "COMMIT;") ;; FIXME à faire marcher en une requete
        ]
    (.transaction db (rm rq-p (rm rq-b (rm rq-c (rm rq-r f)))))
    ;(.transaction db (fn [t r] (.executeSql t rq (clj->js []) f   #(js/alert (str "rm fuck. " (.-message %2))))))
    ))

(defn rm-cost [f cid]
  (let [rq-c (str "DELETE FROM costs WHERE costs.id = " cid " ;")
        rq-r (str "DELETE FROM relcbp WHERE relcbp.cid = " cid " ;")]
    (.transaction db (rm rq-c
                         (rm rq-r f)))))

(defn rm-buddy [f bid]
  (let [rq-c (str "DELETE FROM buddies WHERE buddies.id = " bid " ;")
        rq-r (str "DELETE FROM relcbp WHERE relcbp.bid = " bid " ;")]
    (.transaction db (rm rq-c
                         (rm rq-r f)))))

(defn nuke-db []
  (.transaction db
                (fn [t]
                  (.executeSql t "DROP TABLE IF EXISTS projects;"  (clj->js [])
                               (fn [t r] (.executeSql t "DROP TABLE buddies;" (clj->js [])
                                                      (fn [t r] (.executeSql t "DROP TABLE costs;" (clj->js [])
                                                                             (fn [t r] (.executeSql t "DROP TABLE relcbp;" (clj->js [])
                                                                                                    (fn [t r] (.executeSql t "DROP TABLE settings;" (clj->js [])
                                                                                                                           #(js/alert (str "dropped."))
                                                                                                                           #(js/alert (str "fuck. " (.-message %2)))
                                                                                                                           ))
                                                                                                    #(js/alert (str "fuck. " (.-message %2)))
                                                                                                    ))
                                                                             #(js/alert (str "fuck. " (.-message %2)))
                                                                             ))
                                                      #(js/alert (str "fuck. " (.-message %2)))
                                                      ))
                               #(js/alert (str "fuck. " (.-message %2)))
                               ))))

(defn nuke-settings []
  (.transaction db
                (fn [t] (.executeSql t "DROP TABLE settings;" (clj->js [])
                                     #(js/alert (str "dropped."))
                                     #(js/alert (str "fuck. " (.-message %2)))
                                     ))))
