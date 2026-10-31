# 001-set-cell-value

Empty workbook → set A1 = "Hello world". Shows how Excel represents a simple string (shared string + cell reference).

## Diffs

```diff
diff --git "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\before/[Content_Types].xml" "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\after/[Content_Types].xml"
index a2b96fd..21b8881 100644
--- "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\before/[Content_Types].xml"
+++ "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\after/[Content_Types].xml"
@@ -6,6 +6,7 @@
   <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml" />
   <Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml" />
   <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml" />
+  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml" />
   <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml" />
   <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml" />
 </Types>
\ No newline at end of file
diff --git "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\before/xl/_rels/workbook.xml.rels" "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\after/xl/_rels/workbook.xml.rels"
index 8ddf875..af052a9 100644
--- "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\before/xl/_rels/workbook.xml.rels"
+++ "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\after/xl/_rels/workbook.xml.rels"
@@ -3,4 +3,5 @@
   <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml" />
   <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml" />
   <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml" />
+  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml" />
 </Relationships>
\ No newline at end of file
diff --git "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\after/xl/sharedStrings.xml" "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\after/xl/sharedStrings.xml"
new file mode 100644
index 0000000..00633b3
--- /dev/null
+++ "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\after/xl/sharedStrings.xml"
@@ -0,0 +1,6 @@
+´╗┐<?xml version="1.0" encoding="utf-8" standalone="yes"?>
+<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
+  <si>
+    <t>Hello world</t>
+  </si>
+</sst>
\ No newline at end of file
diff --git "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\before/xl/workbook.xml" "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\after/xl/workbook.xml"
index bbd1afd..27ef7ff 100644
--- "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\before/xl/workbook.xml"
+++ "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\after/xl/workbook.xml"
@@ -7,7 +7,7 @@
       <x15ac:absPath url="D:\Projects\OfficeNext\SheetNext\tools\excel-lab\results\001-set-cell-value\" xmlns:x15ac="http://schemas.microsoft.com/office/spreadsheetml/2010/11/ac" />
     </mc:Choice>
   </mc:AlternateContent>
-  <xr:revisionPtr revIDLastSave="0" documentId="8_{72E05EAF-F9E2-44EE-9C45-2A3CEAADC700}" xr6:coauthVersionLast="47" xr6:coauthVersionMax="47" xr10:uidLastSave="{00000000-0000-0000-0000-000000000000}" />
+  <xr:revisionPtr revIDLastSave="0" documentId="8_{47C3C78A-A275-4E36-9E7A-A62F2B450E3D}" xr6:coauthVersionLast="47" xr6:coauthVersionMax="47" xr10:uidLastSave="{00000000-0000-0000-0000-000000000000}" />
   <bookViews>
     <workbookView xWindow="-120" yWindow="-120" windowWidth="38640" windowHeight="21120" xr2:uid="{95161F3E-726D-4BD8-BE01-BA0C0F86513B}" />
   </bookViews>
diff --git "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\before/xl/worksheets/sheet1.xml" "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\after/xl/worksheets/sheet1.xml"
index a744be9..a319706 100644
--- "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\before/xl/worksheets/sheet1.xml"
+++ "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\001-set-cell-value\\after/xl/worksheets/sheet1.xml"
@@ -5,6 +5,12 @@
     <sheetView tabSelected="1" workbookViewId="0" />
   </sheetViews>
   <sheetFormatPr defaultRowHeight="15" x14ac:dyDescent="0.25" />
-  <sheetData />
+  <sheetData>
+    <row r="1" spans="1:1" x14ac:dyDescent="0.25">
+      <c r="A1" t="s">
+        <v>0</v>
+      </c>
+    </row>
+  </sheetData>
   <pageMargins left="0.511811024" right="0.511811024" top="0.78740157499999996" bottom="0.78740157499999996" header="0.31496062000000002" footer="0.31496062000000002" />
 </worksheet>
\ No newline at end of file

```
