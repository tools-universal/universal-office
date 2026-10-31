# 003-formula

Empty workbook → A1 = formula =1+2. Shows c:f (formula) + c:v (cached calculated value).

## Diffs

```diff
diff --git "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\before/[Content_Types].xml" "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\after/[Content_Types].xml"
index a2b96fd..4655d26 100644
--- "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\before/[Content_Types].xml"
+++ "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\after/[Content_Types].xml"
@@ -6,6 +6,7 @@
   <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml" />
   <Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml" />
   <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml" />
+  <Override PartName="/xl/calcChain.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml" />
   <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml" />
   <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml" />
 </Types>
\ No newline at end of file
diff --git "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\before/xl/_rels/workbook.xml.rels" "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\after/xl/_rels/workbook.xml.rels"
index 8ddf875..4f5d8bf 100644
--- "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\before/xl/_rels/workbook.xml.rels"
+++ "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\after/xl/_rels/workbook.xml.rels"
@@ -3,4 +3,5 @@
   <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml" />
   <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml" />
   <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml" />
+  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/calcChain" Target="calcChain.xml" />
 </Relationships>
\ No newline at end of file
diff --git "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\after/xl/calcChain.xml" "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\after/xl/calcChain.xml"
new file mode 100644
index 0000000..c636c74
--- /dev/null
+++ "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\after/xl/calcChain.xml"
@@ -0,0 +1,4 @@
+´╗┐<?xml version="1.0" encoding="utf-8" standalone="yes"?>
+<calcChain xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
+  <c r="A1" i="1" l="1" />
+</calcChain>
\ No newline at end of file
diff --git "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\before/xl/workbook.xml" "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\after/xl/workbook.xml"
index 2b414a4..19d9ca3 100644
--- "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\before/xl/workbook.xml"
+++ "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\after/xl/workbook.xml"
@@ -7,7 +7,7 @@
       <x15ac:absPath url="D:\Projects\OfficeNext\SheetNext\tools\excel-lab\results\003-formula\" xmlns:x15ac="http://schemas.microsoft.com/office/spreadsheetml/2010/11/ac" />
     </mc:Choice>
   </mc:AlternateContent>
-  <xr:revisionPtr revIDLastSave="0" documentId="8_{AC0DFCA5-197C-4758-8161-20318FA3B191}" xr6:coauthVersionLast="47" xr6:coauthVersionMax="47" xr10:uidLastSave="{00000000-0000-0000-0000-000000000000}" />
+  <xr:revisionPtr revIDLastSave="0" documentId="8_{3DE43643-E428-4AB3-9978-94C0DF613ABE}" xr6:coauthVersionLast="47" xr6:coauthVersionMax="47" xr10:uidLastSave="{00000000-0000-0000-0000-000000000000}" />
   <bookViews>
     <workbookView xWindow="-120" yWindow="-120" windowWidth="38640" windowHeight="21120" xr2:uid="{1DDB6A2D-6570-42F1-AD6B-58944F08F432}" />
   </bookViews>
diff --git "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\before/xl/worksheets/sheet1.xml" "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\after/xl/worksheets/sheet1.xml"
index b11f5b8..14b2d1f 100644
--- "a/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\before/xl/worksheets/sheet1.xml"
+++ "b/D:\\Projects\\OfficeNext\\SheetNext\\tools\\excel-lab\\results\\003-formula\\after/xl/worksheets/sheet1.xml"
@@ -5,6 +5,13 @@
     <sheetView tabSelected="1" workbookViewId="0" />
   </sheetViews>
   <sheetFormatPr defaultRowHeight="15" x14ac:dyDescent="0.25" />
-  <sheetData />
+  <sheetData>
+    <row r="1" spans="1:1" x14ac:dyDescent="0.25">
+      <c r="A1">
+        <f>1+2</f>
+        <v>3</v>
+      </c>
+    </row>
+  </sheetData>
   <pageMargins left="0.511811024" right="0.511811024" top="0.78740157499999996" bottom="0.78740157499999996" header="0.31496062000000002" footer="0.31496062000000002" />
 </worksheet>
\ No newline at end of file

```
