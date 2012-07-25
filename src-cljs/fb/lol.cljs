(ns fb.lol
  (:use [jayq.core :only [$ inner delegate]]
        [jayq.util :only [clj->js]]))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;; page loading
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn load-page [name]
  (let [newp ($ (str "#" name))
        newp (if (zero? (.-length newp)) ($ "#404") newp)
        curr ($ "#content")]
    (.hide curr 300 #(-> curr
                      (.html (.html newp))
                      (.show 300)))))

($ #(delegate ($ "body") "a" "click touchend"
              (fn [e] 
                (let [a    ($ (.-currentTarget e))
                      link (.attr a "href")]
                  (load-page link)
                  false)))) 

($ #(load-page "projects"))


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
                               #(js/alert (str name " added!") )
                               #(js/alert "failed!")))))

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
      ))
