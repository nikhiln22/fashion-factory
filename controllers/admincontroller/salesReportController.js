const orderModel = require('../../model/orderModel');
const PDFDocument = require('pdfkit');
const fs = require('fs');


// rendering the daily sales report page
const dailySalesReport = async (req, res) => {
    try {
        console.log('entering into the daily sales report displaying page');
        let dailyReport = await orderModel.aggregate([
            { $unwind: "$orderedItem" },
            {
                $match: {
                    "orderedItem.productStatus": {
                        $nin: ["Cancelled", "pending", "returned", "shipped"]
                    }
                }
            },
            {
                $project: {
                    day: { $toInt: { $substr: ["$createdAt", 8, 2] } },
                    month: { $toInt: { $substr: ["$createdAt", 5, 2] } },
                    year: { $toInt: { $substr: ["$createdAt", 0, 4] } },
                    orderAmount: 1,
                    couponDiscount: 1,
                    "orderedItem.offer._id": 1,
                    "orderedItem.quantity": 1
                }
            },
            {
                $group: {
                    _id: {
                        orderId: "$_id",
                        day: "$day",
                        month: "$month",
                        year: "$year"
                    },
                    totalSales: { $first: "$orderAmount" },
                    productsCount: { $sum: "$orderedItem.quantity" },
                    offeredProductsSold: {
                        $sum: {
                            $cond: [
                                { $gt: [{ $type: "$orderedItem.offer._id" }, "null"] },
                                "$orderedItem.quantity",
                                0
                            ]
                        }
                    },
                    couponAmount: { $first: "$couponDiscount" },
                }
            },
            {
                $group: {
                    _id: {
                        day: "$_id.day",
                        month: "$_id.month",
                        year: "$_id.year"
                    },
                    totalOrderCount: { $sum: 1 },
                    totalSales: { $sum: "$totalSales" },
                    totalProducts: { $sum: "$productsCount" },
                    offeredProductsSold: { $sum: "$offeredProductsSold" },
                    couponsUsed: { $sum: "$couponAmount" }
                }
            },
            {
                $project: {
                    dateFormatted: {
                        $concat: [
                            { $toString: "$_id.year" }, "-",
                            {
                                $cond: [
                                    { $lt: ["$_id.day", 10] },
                                    { $concat: ["0", { $toString: "$_id.day" }] },
                                    { $toString: "$_id.day" }
                                ]
                            }
                        ]
                    },
                    totalSales: 1,
                    totalProducts: 1,
                    offeredProductsSold: 1,
                    couponsUsed: 1,
                    totalOrderCount: 1
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);

        console.log('dailyReport:', dailyReport);
        const TotalAmount = dailyReport.reduce((acc, curr) => acc + curr.totalSales, 0);
        console.log('TotalAmount:', TotalAmount);
        const TotalSaleCount = dailyReport.reduce((acc, curr) => acc + curr.totalOrderCount, 0);
        console.log('TotalSaleCount:', TotalSaleCount);
        const TotalCouponAmount = dailyReport.reduce((acc, curr) => acc + curr.couponsUsed, 0);
        console.log('TotalCouponAmount:', TotalCouponAmount);

        if (req.query.format === 'pdf') {
            console.log("genertaing the pdf report for the daily sales report");
            const pdfBuffer = await generateSalesReportPdf(
                dailyReport,
                'daily',
                TotalAmount,
                TotalSaleCount,
                TotalCouponAmount,
                '',
                ''
            );
            res.setHeader('content-Type', 'application/pdf');
            res.setHeader('content-Disposition', 'attachment;filename=daily_sales_report.pdf');
            res.setHeader('content-Length', pdfBuffer.length);
            res.contentType('application/pdf');
            res.send(pdfBuffer);
        } else {
            res.render('admin/salesreport', {
                reportData: dailyReport,
                page: "daily",
                TotalAmount: TotalAmount,
                TotalSaleCount: TotalSaleCount,
                TotalCouponAmount: TotalCouponAmount,
                fromDate: '',
                toDate: ''
            });
        }
    } catch (error) {
        console.log('error occured while rendering the daily sales report page', error);
        res.render('admin/servererror');
    }
}


// rendering the weekly sales report page
const weeklySalesReport = async (req, res) => {
    try {
        console.log('entering into the weekly sales report displaying page');
        const sevenWeeksAgo = new Date(new Date().setDate(new Date().getDate() - 49));
        console.log('sevenWeeksAgo:', sevenWeeksAgo);
        // console.log(object);
        const weeklyReport = await orderModel.aggregate([
            { $match: { createdAt: { $gte: sevenWeeksAgo } } },
            { $unwind: "$orderedItem" },
            { $match: { "orderedItem.productStatus": { $nin: ["cancelled", "pending", "returned", "shipped"] } } },
            {
                $project: {
                    week: { $isoWeek: "$createdAt" },
                    year: { $isoWeekYear: "$createdAt" },
                    orderAmount: 1,
                    couponDiscount: 1,
                    orderedItemQuantity: "$orderedItem.quantity",
                    offeredProduct: {
                        $cond: [{ $gt: [{ $type: "$orderedItem.offer_id" }, "null"] }, "$orderedItem.quantity", 0]
                    }
                }
            },
            {
                $group: {
                    _id: { week: "$week", year: "$year", orderId: "$_id" },
                    orderAmount: { $first: "$orderAmount" },
                    couponAmount: { $first: "$couponDiscount" },
                    totalProducts: { $sum: "$orderedItemQuantity" },
                    offeredProductsSold: { $sum: "$offeredProduct" }
                }
            },
            {
                $group: {
                    _id: { week: "$_id.week", year: "$_id.year" },
                    totalOrderCount: { $sum: 1 },
                    totalSales: { $sum: "$orderAmount" },
                    totalProducts: { $sum: "$totalProducts" },
                    offeredProductsSold: { $sum: "$offeredProductsSold" },
                    couponsUsed: { $sum: "$couponAmount" }
                }
            },
            {
                $project: {
                    _id: 0,
                    week: "$_id.week",
                    year: "$_id.year",
                    totalOrderCount: 1,
                    totalSales: 1,
                    totalProducts: 1,
                    offeredProductsSold: 1,
                    couponsUsed: 1,
                    startOfWeek: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: {
                                $dateFromParts: {
                                    isoWeekYear: "$_id.year",
                                    isoWeek: "$_id.week",
                                    isoDayOfWeek: 1
                                }
                            }
                        }
                    },
                    endOfWeek: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: {
                                $dateFromParts: {
                                    isoWeekYear: "$_id.year",
                                    isoWeek: "$_id.week",
                                    isoDayOfWeek: 7
                                }
                            }
                        }
                    }
                }
            },
            { $sort: { "year": 1, "week": 1 } }
        ]);

        console.log('weeklyReport:', weeklyReport);

        if (req.query.format === 'pdf') {
            const pdfBuffer = await generateSalesReportPdf(
                weeklyReport,
                'weekly',
                weeklyReport.reduce((acc, curr) => acc + curr.totalSales, 0),
                weeklyReport.reduce((acc, curr) => acc + curr.totalOrderCount, 0),
                weeklyReport.reduce((acc, curr) => acc + curr.couponsUsed, 0),
                '',
                ''
            );
            res.setHeader('content-Type', 'application/pdf');
            res.setHeader('content-Disposition', 'attachment;filename=weekly_sales_report.pdf');
            res.setHeader('content-Length', pdfBuffer.length);
            res.contentType('application/pdf');
            res.send(pdfBuffer);
        } else {
            res.render('admin/salesreport', {
                reportData: weeklyReport,
                page: 'weekly',
                TotalAmount: weeklyReport.reduce((acc, curr) => acc + curr.totalSales, 0),
                TotalSaleCount: weeklyReport.reduce((acc, curr) => acc + curr.totalOrderCount, 0),
                TotalCouponAmount: weeklyReport.reduce((acc, curr) => acc + curr.couponsUsed, 0),
                fromDate: '',
                toDate: ''
            });
        }
    } catch (error) {
        console.log('Error occured while rendering the weekly sales report page', error);
        res.render('admin/servererror')
    }
};


// rendering into the monthly sales report page
const monthlySalesReport = async (req, res) => {
    try {
        // Calculate the date 12 months ago
        const twelveMonthsAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1));

        // Perform MongoDB aggregation
        const monthlyReport = await orderModel.aggregate([
            // Stage 1: Match orders from the last 12 months
            { $match: { createdAt: { $gte: twelveMonthsAgo } } },

            // Stage 2: Unwind the orderedItem array
            { $unwind: "$orderedItem" },

            // Stage 3: Match only certain product statuses
            { $match: { "orderedItem.productStatus": { $nin: ["cancelled", "pending", "returned", "shipped"] } } },

            // Stage 4: Project relevant fields
            {
                $project: {
                    month: { $month: "$createdAt" },
                    year: { $isoWeekYear: "$createdAt" },
                    orderAmount: 1,
                    couponDiscount: 1,
                    orderedItemQuantity: "$orderedItem.quantity",
                    offeredProduct: {
                        $cond: [{ $gt: [{ $type: "$orderedItem.offer_id" }, "null"] }, "$orderedItem.quantity", 0]
                    }
                }
            },

            // Stage 5: Group by order
            {
                $group: {
                    _id: { month: "$month", year: "$year", orderId: "$_id" },
                    orderAmount: { $first: "$orderAmount" },
                    couponAmount: { $first: "$couponDiscount" },
                    totalProducts: { $sum: "$orderedItemQuantity" },
                    offeredProductsSold: { $sum: "$offeredProduct" }
                }
            },

            // Stage 6: Group by month and year
            {
                $group: {
                    _id: { month: "$_id.month", year: "$_id.year" },
                    totalOrderCount: { $sum: 1 },
                    totalSales: { $sum: "$orderAmount" },
                    totalProducts: { $sum: "$totalProducts" },
                    offeredProductsSold: { $sum: "$offeredProductsSold" },
                    couponsUsed: { $sum: "$couponAmount" }
                }
            },

            // Stage 7: Project final fields
            {
                $project: {
                    _id: 0,
                    month: "$_id.month",
                    year: "$_id.year",
                    totalOrderCount: 1,
                    totalSales: 1,
                    totalProducts: 1,
                    offeredProductsSold: 1,
                    couponsUsed: 1,
                    monthName: {
                        $arrayElemAt: [
                            ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
                            { $subtract: ["$_id.month", 1] }
                        ]
                    }
                }
            },

            // Stage 8: Add monthYear field
            {
                $addFields: {
                    monthYear: { $concat: ["$monthName", "-", { $toString: "$year" }] }
                }
            },

            // Stage 9: Sort by year and month
            { $sort: { "year": 1, "month": 1 } }
        ]);

        // Render the report

        if (req.query.format === 'pdf') {
            const pdfBuffer = await generateSalesReportPdf(
                monthlyReport,
                'monthly',
                monthlyReport.reduce((acc, curr) => acc + curr.totalSales, 0),
                monthlyReport.reduce((acc, curr) => acc + curr.totalOrderCount, 0),
                monthlyReport.reduce((acc, curr) => acc + curr.couponsUsed, 0),
                '',
                ''
            );
            res.setHeader('content-Type', 'application/pdf');
            res.setHeader('content-Disposition', 'attachment;filename=monthly_sales_report.pdf');
            res.setHeader('content-Length', pdfBuffer.length);
            res.contentType('application/pdf');
            res.send(pdfBuffer);
        } else {
            res.render('admin/salesreport', {
                reportData: monthlyReport,
                page: 'monthly',
                TotalAmount: monthlyReport.reduce((acc, curr) => acc + curr.totalSales, 0),
                TotalSaleCount: monthlyReport.reduce((acc, curr) => acc + curr.totalOrderCount, 0),
                TotalCouponAmount: monthlyReport.reduce((acc, curr) => acc + curr.couponsUsed, 0),
                fromDate: '',
                toDate: ''
            });
        }
    } catch (error) {
        console.log('error in monthly sales report', error);
        res.status(500).send('Error generating monthly sales report');
    }
};


// rendering the yearly sales report page
const yearlySalesReport = async (req, res) => {
    try {
        // Perform MongoDB aggregation for yearly report
        const yearlyReport = await orderModel.aggregate([
            // Stage 1: Unwind the orderedItem array
            { $unwind: "$orderedItem" },

            // Stage 2: Match only certain product statuses
            { $match: { "orderedItem.productStatus": { $nin: ["cancelled", "pending", "returned"] } } },

            // Stage 3: Project relevant fields
            {
                $project: {
                    year: { $isoWeekYear: "$createdAt" },
                    orderAmount: 1,
                    couponDiscount: 1,
                    orderedItemQuantity: "$orderedItem.quantity",
                    offeredProduct: {
                        $cond: [{ $gt: [{ $type: "$orderedItem.offer_id" }, "null"] }, "$orderedItem.quantity", 0]
                    }
                }
            },

            // Stage 4: Group by order
            {
                $group: {
                    _id: { year: "$year", orderId: "$_id" },
                    orderAmount: { $first: "$orderAmount" },
                    couponAmount: { $first: "$couponDiscount" },
                    totalProducts: { $sum: "$orderedItemQuantity" },
                    offeredProductsSold: { $sum: "$offeredProduct" }
                }
            },

            // Stage 5: Group by year
            {
                $group: {
                    _id: { year: "$_id.year" },
                    totalOrderCount: { $sum: 1 },
                    totalSales: { $sum: "$orderAmount" },
                    totalProducts: { $sum: "$totalProducts" },
                    offeredProductsSold: { $sum: "$offeredProductsSold" },
                    couponsUsed: { $sum: "$couponAmount" }
                }
            },

            // Stage 6: Project final fields
            {
                $project: {
                    _id: 0,
                    year: "$_id.year",
                    totalOrderCount: 1,
                    totalSales: 1,
                    totalProducts: 1,
                    offeredProductsSold: 1,
                    couponsUsed: 1
                }
            },

            // Stage 7: Sort by year
            { $sort: { "year": 1 } }
        ]);

        // Calculate total amount across all years
        const totalAmountResult = await orderModel.aggregate([
            { $group: { _id: null, totalAmount: { $sum: "$orderAmount" } } }
        ]);
        const TotalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;

        console.log("yearlyReport", yearlyReport);

        // Render the report
        if (req.query.format === 'pdf') {
            const pdfBuffer = await generateSalesReportPdf(
                yearlyReport,
                'yearly',
                yearlyReport.reduce((acc, curr) => acc + curr.totalSales, 0),
                yearlyReport.reduce((acc, curr) => acc + curr.totalOrderCount, 0),
                yearlyReport.reduce((acc, curr) => acc + curr.couponsUsed, 0),
                '',
                ''
            );
            res.setHeader('content-Type', 'application/pdf');
            res.setHeader('content-Disposition', 'attachment;filename=yearly_sales_report.pdf');
            res.setHeader('content-Length', pdfBuffer.length);
            res.contentType('application/pdf');
            res.send(pdfBuffer);
        } else {
            res.render('admin/salesreport', {
                reportData: yearlyReport,
                page: 'yearly',
                TotalAmount: yearlyReport.reduce((acc, curr) => acc + curr.totalSales, 0),
                TotalSaleCount: yearlyReport.reduce((acc, curr) => acc + curr.totalOrderCount, 0),
                TotalCouponAmount: yearlyReport.reduce((acc, curr) => acc + curr.couponsUsed, 0),
                fromDate: '',
                toDate: ''
            });
        }
    } catch (error) {
        console.log('error in yearly sales report', error);
        res.status(500).send('Error generating yearly sales report');
    }
};


// filtering the sales data based on the montly, yearly and daily basis
const salesData = async (req, res) => {
    try {
        console.log('entered to the filtering sales data');
        const { filter } = req.query;
        console.log('filter:',filter);
        let salesData = {};
        if (filter === 'yearly') {
            salesData = await getYearlySalesData()
        } else if (filter === 'monthly') {
            salesData = await getMontlySalesData()
        } else if (filter === 'daily') {
            salesData = await getDailySalesData()
        } else {
            throw new Error("Invalid filter parameter");
        }
        res.json(salesData)
    } catch (error) {
        console.log('error occured while fetching the sales data', error);
        res.render('admin/servererror');
    }
}

async function getDailySalesData() {
    console.log('function fetching the saily sales data');
    const Aggregation = await orderModel.aggregate([
        {
            $match: {
                createdAt: { $exists: true },
            },
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 },
            },
        },
        {
            $sort: { _id: 1 },
        },
    ]);


    const saleDate = Aggregation.map((item) => item._id);
    console.log('saleData:',saleDate);
    const count = Aggregation.map((item) => item.count);
    console.log('count:',count);
    return { saleDate, count };
}

async function getMontlySalesData() {
    const Aggregation = await orderModel.aggregate([
        {
            $match: {
                createdAt: { $exists: true },
            },
        },
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                },
                count: { $sum: 1 },
            },
        },
        {
            $sort: {
                "_id.year": 1,
                "_id.month": 1,
            },
        },
    ]);


    const saleDate = Aggregation.map((item) => item._id.month);
    const count = Aggregation.map((item) => item.count);
    return { saleDate, count };
}

async function getYearlySalesData() {
    const getYearlySalesData = await orderModel.aggregate([
        {
            $match: {
                createdAt: { $exists: true },
            },
        },
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                },
                count: { $sum: 1 },
            },
        },

    ]);

    const saleDate = getYearlySalesData.map((item) => item._id.year);
    const count = getYearlySalesData.map((item) => item.count);
    return { saleDate, count };
}


// rendering the reports based on the selected date
const customDateSort = async (req, res) => {
    try {
        const { fromDate, toDate } = req.body
        console.log("fromDate", fromDate);
        console.log("toDate:", toDate);
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        console.log('startDate:', startDate);
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);

        const customReport = await orderModel.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            { $unwind: "$orderedItem" },
            { $match: { "orderedItem.productStatus": { $nin: ["cancelled", "pending", "returned", "shipped"] } } },
            {
                $project: {
                    day: { $dayOfMonth: "$createdAt" },
                    month: { $month: "$createdAt" },
                    year: { $year: "$createdAt" },
                    orderAmount: 1,
                    couponDiscount: 1,
                    "orderedItem.offer_id": 1,
                    "orderedItem.quantity": 1
                }
            },
            {
                $group: {
                    _id: {
                        orderId: "$_id",
                        day: "$day",
                        month: "$month",
                        year: "$year"
                    },
                    totalSales: { $first: "$orderAmount" },
                    productsCount: { $sum: "$orderedItem.quantity" },
                    offeredProductsSold: {
                        $sum: {
                            $cond: [
                                { $gt: [{ $type: "$orderedItem.offer_id" }, "null"] },
                                "$orderedItem.quantity",
                                0
                            ]
                        }
                    },
                    couponAmount: { $first: "$couponDiscount" },
                }
            },
            {
                $group: {
                    _id: {
                        day: "$_id.day",
                        month: "$_id.month",
                        year: "$_id.year"
                    },
                    totalOrderCount: { $sum: 1 },
                    totalSales: { $sum: "$totalSales" },
                    totalProducts: { $sum: "$productsCount" },
                    offeredProductsSold: { $sum: "$offeredProductsSold" },
                    couponsUsed: { $sum: "$couponAmount" }
                }
            },
            {
                $project: {
                    dateFormatted: {
                        $concat: [
                            { $toString: "$_id.year" }, "-",
                            { $cond: [{ $lt: ["$_id.month", 10] }, { $concat: ["0", { $toString: "$_id.month" }] }, { $toString: "$_id.month" }] }, "-",
                            { $cond: [{ $lt: ["$_id.day", 10] }, { $concat: ["0", { $toString: "$_id.day" }] }, { $toString: "$_id.day" }] }
                        ]
                    },
                    totalSales: 1,
                    totalProducts: 1,
                    offeredProductsSold: 1,
                    couponsUsed: 1,
                    totalOrderCount: 1
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);
        console.log("customReport:", customReport);

        if (req.query.format === 'pdf') {
            const pdfBuffer = await generateSalesReportPdf(
                customReport,
                'custom',
                customReport.reduce((acc, curr) => acc + curr.totalSales, 0),
                customReport.reduce((acc, curr) => acc + curr.totalOrderCount, 0),
                customReport.reduce((acc, curr) => acc + curr.couponsUsed, 0),
                fromDate,
                toDate
            );
            res.setHeader('content-Type', 'application/pdf');
            res.setHeader('content-Disposition', 'attachment;filename=custom_sales_report.pdf');
            res.setHeader('content-Length', pdfBuffer.length);
            res.contentType('application/pdf');
            res.send(pdfBuffer);
        } else {
            res.render("admin/salesreport", {
                reportData: customReport,
                page: 'daily',
                TotalAmount: customReport.reduce((acc, curr) => acc + curr.totalSales, 0),
                TotalSaleCount: customReport.reduce((acc, curr) => acc + curr.totalOrderCount, 0),
                TotalCouponAmount: customReport.reduce((acc, curr) => acc + curr.couponsUsed, 0),
                fromDate, toDate
            });
        }
    } catch (error) {
        console.log("error in custom sales report");
    }
}


// checking whether order data exists in the specified Date range
const checkDataExist = async (req, res) => {
    try {
        console.log('entering into the function checking the data existance in the specified date range');
        const { fromDate, toDate } = req.query;
        console.log('fromDate:', fromDate);
        console.log('toDate:', toDate);

        // create the Date objects and set to start and end of the day
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);

        // validate date range
        if (startDate > endDate) {
            return res.status(400).json({
                success: false,
                message: "start date cannot be greater than the end date"
            });
        }

        // finding the orders from the database within the specified date range
        const data = await orderModel.find({
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        });

        console.log('data:', data);

        // check if data exists and return appropriate response
        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No Data found within the specified Date range"
            })
        } else {
            return res.status(200).json({
                success: true,
                message: "Data found within the specified date range",
                count: data.length
            })
        }
    } catch (error) {
        console.log('error in checking DataExisting:', error);
        return res.status(500).json({
            success: false,
            message: "An error occured while checking for the data",
            error: error.message
        })
    }
}

// generate sales report in pdf
const generateSalesReportPdf = (reportData, reportType, totalAmount, TotalSaleCount, TotalCouponAmount, fromDate, toDate) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        // Set default font and color
        doc.font('Helvetica-Bold').fontSize(12).fillColor('black');
        // Add main heading
        doc.fontSize(24).font('Helvetica-Bold').text('SALES REPORT', { align: 'center' });
        doc.moveDown();
        // Add report type and date range
        doc.fontSize(12).font('Helvetica').text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, { align: 'left' });
        if (fromDate && toDate) {
            doc.text(`Date Range: ${fromDate} to ${toDate}`, { align: 'left' });
        }
        doc.moveDown();
        // Add summary
        doc.fontSize(14).font('Helvetica-Bold').text('Summary:', { underline: true });
        doc.fontSize(12).font('Helvetica')
            .text(`Total sales: Rs. ${totalAmount.toFixed(2)}`)
            .text(`Total Orders: ${TotalSaleCount}`)
            .text(`Total Coupon Amount: Rs. ${TotalCouponAmount.toFixed(2)}`);
        doc.moveDown();
        // Table configuration
        const table = {
            x: 50,
            y: doc.y + 10,
            width: doc.page.width - 100,
            rowHeight: 30,
            columnWidth: (doc.page.width - 100) / 6
        };
        // Draw table header
        drawTableRow(doc, table, ['Date', 'Orders', 'Sales', 'Products', 'Offered', 'Coupons'], true);
        // Draw table rows
        reportData.forEach((row, index) => {
            if (table.y > doc.page.height - 50) {
                doc.addPage();
                table.y = 50;
            }
            const rowData = [
                row.dateFormatted || `${row.monthYear || row.year}`,
                row.totalOrderCount.toString(),
                `Rs.${row.totalSales.toFixed(2)}`,
                row.totalProducts.toString(),
                row.offeredProductsSold.toString(),
                `Rs.${row.couponsUsed.toFixed(2)}`
            ];
            drawTableRow(doc, table, rowData);
        });
        doc.end();
    });

    function drawTableRow(doc, table, rowData, isHeader = false) {
        // Draw horizontal lines
        doc.lineWidth(1)
            .moveTo(table.x, table.y)
            .lineTo(table.x + table.width, table.y)
            .stroke();

        // Draw vertical lines and cell content
        rowData.forEach((text, i) => {
            // Draw vertical line
            doc.moveTo(table.x + i * table.columnWidth, table.y)
                .lineTo(table.x + i * table.columnWidth, table.y + table.rowHeight)
                .stroke();

            // Add cell content
            doc.fillColor(isHeader ? 'black' : 'gray')
                .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
                .fontSize(isHeader ? 12 : 10)
                .text(
                    text,
                    table.x + i * table.columnWidth + 5,
                    table.y + 10,
                    {
                        width: table.columnWidth - 10,
                        align: 'center'
                    }
                );
        });

        // Draw the last vertical line
        doc.moveTo(table.x + table.width, table.y)
            .lineTo(table.x + table.width, table.y + table.rowHeight)
            .stroke();

        // Draw bottom horizontal line for the last row
        if (table.y + table.rowHeight > doc.page.height - 50) {
            doc.addPage();
            table.y = 50;
        } else {
            doc.moveTo(table.x, table.y + table.rowHeight)
                .lineTo(table.x + table.width, table.y + table.rowHeight)
                .stroke();
        }

        table.y += table.rowHeight;
    }
};



module.exports = {
    dailySalesReport,
    weeklySalesReport,
    monthlySalesReport,
    yearlySalesReport,
    customDateSort,
    checkDataExist,
    salesData,
}