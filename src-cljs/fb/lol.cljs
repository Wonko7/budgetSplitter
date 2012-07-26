(ns fb.lol
  (:use [jayq.core :only [$ inner delegate]]
        [jayq.util :only [clj->js]]))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; page loading
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(def page-dyn-inits {})

(defn add-init! [name func]
  (def page-dyn-inits (into page-dyn-inits {name func})))

(defn load-dyn-page [name]
   (if-let [f (page-dyn-inits name)]
     (f))) 

(defn load-page [name]
  (let [newp ($ (str "#" name))
        newp (if (zero? (.-length newp)) ($ "#404") newp)
        curr ($ "#content")]
    (.hide curr 300 #(-> curr
                       (.html (.html newp))
                       (load-dyn-page name)
                       (.show 300)))))

($ #(delegate ($ "body") "a" "click touchend"
              (fn [e] 
                (let [a    ($ (.-currentTarget e))
                      link (.attr a "href")]
                  (load-page link)
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

(defn add-proj [name]
  (.transaction db
                (fn [t]
                  (.executeSql t "INSERT INTO projects (name) VALUES (?);" (clj->js [name]) 
                               ))))
(defn add-buddy [name img]
  (.transaction db
                (fn [t]
                  (.executeSql t "INSERT INTO buddies (name, img) VALUES (?, ?);" (clj->js [name img])))))

(defn add-cost [name buddies proj amount]
  (.transaction db
                (fn [t]
                  (.executeSql t "INSERT INTO costs (name, pid, tot) VALUES (?, ?, ?);" (clj->js [name proj amount])
                               (fn [t r]
                                 (doseq [b buddies]
                                   (.executeSql t "INSERT INTO relcbp (pid, bid, cid, tot) VALUES (?, ?, ?, ?);"
                                                (clj->js [proj b (.-insertId r) 3])
                                                ; #(js/alert (str :done [proj b (.-insertId r) 3] ))
                                                ; #(js/alert (str :failed [proj b (.-insertId r) 3] ))
                                                ))) 
                               ; #(js/alert "INSERT INTO costs (name, pid, tot) VALUES (?, ?); failed."))
                               ))))

(defn do-proj [f & id]
  (let [rq (if id
             (str "SELECT * FROM projects WHERE projects.id = " id ";" )
             "SELECT * FROM projects")]
    (.transaction db
                  (fn [t]
                    (.executeSql t rq (clj->js [])
                                 #(f %1 %2)
                                 ;#(js/alert (str "fuck. " (.-message %2)))
                               )))))

(defn do-row [f r]
  (doseq [i (range (.-length (.-rows r)))]
    (f (.item (.-rows r) i))))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; pages
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn show-projects []
  (let [ul ($ "#projects div:list ul")]
    (do-proj (fn [t r]
                 (do-row (fn [i]
                           (js/alert (.-name  i)))
                          r)
                 ))))

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
      ;(add-cost "tardis" [1 2 3 4] 1 744)
      ;(get-proj)
      (load-page "projects")
      
      ))

