(ns fb.lol
  (:use [jayq.core :only [$ inner]]))

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

($ #(jayq.core/delegate ($ "body") "a" :click
                        (fn [e]
                          (let [a    ($ (.-currentTarget e))
                                link (.attr a "href")]
                            ;(.preventDefault e)
                            ;(js/alert (str "#" link))
                            (load-page link)
                            false)))) 

($ #(load-page "projects"))
