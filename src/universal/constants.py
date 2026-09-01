STEMS = ["Giáp","Ất","Bính","Đinh","Mậu","Kỷ","Canh","Tân","Nhâm","Quý"]
BRANCHES = ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"]
ELEMENTS = ["wood","fire","earth","metal","water"]
ELEMENT_VI = {"wood":"Mộc","fire":"Hỏa","earth":"Thổ","metal":"Kim","water":"Thủy"}
STEM_ELEMENT = ["wood","wood","fire","fire","earth","earth","metal","metal","water","water"]
BRANCH_ELEMENT = ["water","earth","wood","wood","earth","fire","fire","earth","metal","metal","earth","water"]
DIGIT_ELEMENT = {"0":"earth","1":"water","2":"fire","3":"wood","4":"metal","5":"earth","6":"water","7":"fire","8":"wood","9":"metal"}
GENERATES = {"wood":"fire","fire":"earth","earth":"metal","metal":"water","water":"wood"}
CONTROLS = {"wood":"earth","earth":"water","water":"fire","fire":"metal","metal":"wood"}
OFFICERS = ["Kiến","Trừ","Mãn","Bình","Định","Chấp","Phá","Nguy","Thành","Thu","Khai","Bế"]
OFFICER_SCORE = {"Thành":1.00,"Khai":.90,"Định":.85,"Thu":.75,"Mãn":.70,"Trừ":.65,"Bình":.60,"Kiến":.55,"Chấp":.55,"Nguy":.35,"Bế":.30,"Phá":.25}
SEASON_STATE_SCORE = {"vuong":1.00,"tuong":.80,"huu":.45,"tu":.25,"tử":.10,"tu2":.10}
# 24 solar terms from Tiểu Hàn through Đông Chí. Minute offsets from 1900 mean-term algorithm.
SOLAR_TERM_MINUTES = [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758]
SOLAR_TERM_NAMES = ["Tiểu Hàn","Đại Hàn","Lập Xuân","Vũ Thủy","Kinh Trập","Xuân Phân","Thanh Minh","Cốc Vũ","Lập Hạ","Tiểu Mãn","Mang Chủng","Hạ Chí","Tiểu Thử","Đại Thử","Lập Thu","Xử Thử","Bạch Lộ","Thu Phân","Hàn Lộ","Sương Giáng","Lập Đông","Tiểu Tuyết","Đại Tuyết","Đông Chí"]
# Jie boundaries for Dần→Sửu months.
JIE_TERM_INDEXES = [2,4,6,8,10,12,14,16,18,20,22,0]
# Trigram order uses traditional 1=Qian...8=Kun for the project convention.
TRIGRAMS = {
  1:{"name":"Càn","bits":"111","element":"metal"},
  2:{"name":"Đoài","bits":"110","element":"metal"},
  3:{"name":"Ly","bits":"101","element":"fire"},
  4:{"name":"Chấn","bits":"100","element":"wood"},
  5:{"name":"Tốn","bits":"011","element":"wood"},
  6:{"name":"Khảm","bits":"010","element":"water"},
  7:{"name":"Cấn","bits":"001","element":"earth"},
  8:{"name":"Khôn","bits":"000","element":"earth"},
}
NAYIN = [
("Hải Trung Kim","metal"),("Lư Trung Hỏa","fire"),("Đại Lâm Mộc","wood"),("Lộ Bàng Thổ","earth"),("Kiếm Phong Kim","metal"),
("Sơn Đầu Hỏa","fire"),("Giản Hạ Thủy","water"),("Thành Đầu Thổ","earth"),("Bạch Lạp Kim","metal"),("Dương Liễu Mộc","wood"),
("Tuyền Trung Thủy","water"),("Ốc Thượng Thổ","earth"),("Tích Lịch Hỏa","fire"),("Tùng Bách Mộc","wood"),("Trường Lưu Thủy","water"),
("Sa Trung Kim","metal"),("Sơn Hạ Hỏa","fire"),("Bình Địa Mộc","wood"),("Bích Thượng Thổ","earth"),("Kim Bạch Kim","metal"),
("Phúc Đăng Hỏa","fire"),("Thiên Hà Thủy","water"),("Đại Trạch Thổ","earth"),("Thoa Xuyến Kim","metal"),("Tang Đố Mộc","wood"),
("Đại Khê Thủy","water"),("Sa Trung Thổ","earth"),("Thiên Thượng Hỏa","fire"),("Thạch Lựu Mộc","wood"),("Đại Hải Thủy","water")]
