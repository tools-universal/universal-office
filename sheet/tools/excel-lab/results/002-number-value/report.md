# 002-number-value

Empty workbook → set A1 = 42 (number). Shows that a number goes directly into c:v with no t attribute (default n) and does NOT create sharedStrings.xml.

## Diffs

```diff
diff --git "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\002-number-value\\before/xl/workbook.xml" "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\002-number-value\\after/xl/workbook.xml"
index 1d364e2..e3d0914 100644
--- "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\002-number-value\\before/xl/workbook.xml"
+++ "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\002-number-value\\after/xl/workbook.xml"
@@ -7,7 +7,7 @@
       <x15ac:absPath url="D:\Projects\OfficeNext\SheetNext\tools\excel-lab\results\002-number-value\" xmlns:x15ac="http://schemas.microsoft.com/office/spreadsheetml/2010/11/ac" />
     </mc:Choice>
   </mc:AlternateContent>
-  <xr:revisionPtr revIDLastSave="0" documentId="8_{D8E5EA67-15C2-48B0-870A-6C180CEF723E}" xr6:coauthVersionLast="47" xr6:coauthVersionMax="47" xr10:uidLastSave="{00000000-0000-0000-0000-000000000000}" />
+  <xr:revisionPtr revIDLastSave="0" documentId="8_{E4E7C8C1-D790-41AC-A65D-B53321844082}" xr6:coauthVersionLast="47" xr6:coauthVersionMax="47" xr10:uidLastSave="{00000000-0000-0000-0000-000000000000}" />
   <bookViews>
     <workbookView xWindow="-120" yWindow="-120" windowWidth="38640" windowHeight="21120" xr2:uid="{8C6C9EDA-ABF3-4800-90D8-5100C2821E34}" />
   </bookViews>
diff --git "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\002-number-value\\before/xl/worksheets/sheet1.xml" "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\002-number-value\\after/xl/worksheets/sheet1.xml"
index a0a8c2e..858edab 100644
--- "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\002-number-value\\before/xl/worksheets/sheet1.xml"
+++ "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\002-number-value\\after/xl/worksheets/sheet1.xml"
@@ -5,6 +5,12 @@
     <sheetView tabSelected="1" workbookViewId="0" />
   </sheetViews>
   <sheetFormatPr defaultRowHeight="15" x14ac:dyDescent="0.25" />
-  <sheetData />
+  <sheetData>
+    <row r="1" spans="1:1" x14ac:dyDescent="0.25">
+      <c r="A1">
+        <v>42</v>
+      </c>
+    </row>
+  </sheetData>
   <pageMargins left="0.511811024" right="0.511811024" top="0.78740157499999996" bottom="0.78740157499999996" header="0.31496062000000002" footer="0.31496062000000002" />
 </worksheet>
\ No newline at end of file

```
